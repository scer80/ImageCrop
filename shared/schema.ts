import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Simple schema for uploaded images (though we're using in-memory storage)
export const images = pgTable("images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: text("size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const insertImageSchema = createInsertSchema(images).pick({
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
});

export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;

// Crop request schema
export const cropRequestSchema = z.object({
  filename: z.string(),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(1),
  height: z.number().min(1),
});

export type CropRequest = z.infer<typeof cropRequestSchema>;
