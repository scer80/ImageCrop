import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { insertImageSchema, cropRequestSchema } from "@shared/schema";
import session from 'express-session';
import { MemoryStore } from 'express-session';

// Extend Request type to include file from multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Track which files belong to which session
const sessionFiles = new Map<string, string[]>(); // sessionId -> [filenames]

// Clean up old files when user uploads new ones
const cleanupOldSessionFiles = (sessionId: string) => {
  const oldFiles = sessionFiles.get(sessionId);
  if (oldFiles && oldFiles.length > 0) {
    oldFiles.forEach(filename => {
      const filepath = path.join(uploadsDir, filename);
      fs.unlink(filepath, (err) => {
        if (err) {
          console.error(`Failed to delete old file: ${filename}`, err);
        } else {
          console.log(`Cleaned up old file: ${filename}`);
        }
      });
    });
    // Clear the old files list
    sessionFiles.set(sessionId, []);
  }
};

// Add a simple heartbeat endpoint to detect active users
const activeUsers = new Map<string, number>(); // sessionId -> lastActivity timestamp

const updateUserActivity = (sessionId: string) => {
  activeUsers.set(sessionId, Date.now());
};

const cleanupInactiveUsers = () => {
  const now = Date.now();
  const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  
  activeUsers.forEach((lastActivity, sessionId) => {
    if (now - lastActivity > INACTIVITY_THRESHOLD) {
      // User inactive for 5 minutes, clean up their files
      const files = sessionFiles.get(sessionId);
      if (files && files.length > 0) {
        files.forEach(filename => {
          const filepath = path.join(uploadsDir, filename);
          fs.unlink(filepath, (err) => {
            if (err) {
              console.error(`Failed to delete inactive user file: ${filename}`, err);
            } else {
              console.log(`Cleaned up inactive user file: ${filename}`);
            }
          });
        });
        sessionFiles.delete(sessionId);
      }
      activeUsers.delete(sessionId);
    }
  });
};

// Run cleanup every minute
setInterval(cleanupInactiveUsers, 60 * 1000);

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload image endpoint
  app.post("/api/upload", upload.single('image'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${req.file.mimetype.split('/')[1]}`;
      const filepath = path.join(uploadsDir, filename);

      // Save the file
      await fs.promises.writeFile(filepath, req.file.buffer);

      // Store image metadata
      const imageData = {
        filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size.toString(),
      };

      const validatedData = insertImageSchema.parse(imageData);
      const image = await storage.createImage(validatedData);

      // Associate file with current session
      const sessionId = req.sessionID;
      if (!sessionFiles.has(sessionId)) {
        sessionFiles.set(sessionId, []);
      }
      // Clean up any old files from this session before adding new one
      cleanupOldSessionFiles(sessionId);

      sessionFiles.get(sessionId)!.push(filename);

      // Update user activity
      updateUserActivity(sessionId);

      res.json({ 
        id: image.id,
        filename: image.filename,
        originalName: image.originalName,
        mimeType: image.mimeType,
        size: image.size
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Serve uploaded images
  app.get("/api/images/:filename", (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Update user activity when they access images
    const sessionId = req.sessionID;
    if (sessionId) {
      updateUserActivity(sessionId);
    }

    res.sendFile(filepath);
  });

  // Crop image endpoint
  app.post("/api/crop", async (req, res) => {
    try {
      const cropData = cropRequestSchema.parse(req.body);
      const filepath = path.join(uploadsDir, cropData.filename);

      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Use Sharp to crop the image
      const croppedImageBuffer = await sharp(filepath)
        .extract({
          left: Math.round(cropData.x),
          top: Math.round(cropData.y),
          width: Math.round(cropData.width),
          height: Math.round(cropData.height),
        })
        .png()
        .toBuffer();

      // Set headers for download
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="cropped-${cropData.filename}"`);
      
      // Clean up the original file after cropping
      const cleanupFilepath = path.join(uploadsDir, cropData.filename);
      fs.unlink(cleanupFilepath, (err) => {
        if (err) {
          console.error(`Failed to delete file after cropping: ${cropData.filename}`, err);
        } else {
          console.log(`Cleaned up file after cropping: ${cropData.filename}`);
        }
      });
      
      res.send(croppedImageBuffer);
    } catch (error) {
      console.error('Crop error:', error);
      res.status(500).json({ message: "Failed to crop image" });
    }
  });

  const httpServer = createServer(app);
  
  // Graceful shutdown - clean up all uploaded files
  const cleanupOnShutdown = () => {
    console.log('Server shutting down, cleaning up uploaded files...');
    
    // Delete all files in uploads directory
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(filename => {
        const filepath = path.join(uploadsDir, filename);
        fs.unlink(filepath, (err) => {
          if (err) {
            console.error(`Failed to delete file during shutdown: ${filename}`, err);
          } else {
            console.log(`Cleaned up file during shutdown: ${filename}`);
          }
        });
      });
    }
    
    console.log('Cleanup completed, server shutting down.');
    process.exit(0);
  };
  
  // Handle graceful shutdown signals
  process.on('SIGTERM', cleanupOnShutdown);
  process.on('SIGINT', cleanupOnShutdown);
  process.on('SIGUSR2', cleanupOnShutdown); // For nodemon restarts
  
  return httpServer;
}
