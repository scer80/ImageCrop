import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Download, RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageCropProps {
  imageData: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: string;
  };
  onReplaceImage: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCrop({ imageData, onReplaceImage }: ImageCropProps) {
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const cropMutation = useMutation({
    mutationFn: async (cropData: CropArea) => {
      const response = await fetch('/api/crop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: imageData.filename,
          ...cropData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to crop image');
      }

      return response.blob();
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cropped-${imageData.originalName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Cropped image downloaded successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to crop image",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const image = imageRef.current;
    if (image) {
      const updateImageSize = () => {
        setImageSize({
          width: image.offsetWidth,
          height: image.offsetHeight,
        });
        setOriginalImageSize({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };

      image.onload = updateImageSize;
      if (image.complete) {
        updateImageSize();
      }

      window.addEventListener('resize', updateImageSize);
      return () => window.removeEventListener('resize', updateImageSize);
    }
  }, []);

  // ESC key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cropArea) {
        setCropArea(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cropArea]);

  const getRelativePosition = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: e.clientX - rect.left - 16, // Account for padding
      y: e.clientY - rect.top - 16,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getRelativePosition(e);
    
    // Check if clicking on a resize handle
    if (cropArea) {
      const handleSize = 8;
      const handles = [
        { name: 'nw', x: cropArea.x - handleSize/2, y: cropArea.y - handleSize/2 },
        { name: 'ne', x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y - handleSize/2 },
        { name: 'sw', x: cropArea.x - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 },
        { name: 'se', x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 },
      ];
      
      for (const handle of handles) {
        if (pos.x >= handle.x && pos.x <= handle.x + handleSize &&
            pos.y >= handle.y && pos.y <= handle.y + handleSize) {
          setIsResizing(handle.name);
          setStartPoint(pos);
          return;
        }
      }
      
      // Check if clicking inside the crop area (for dragging)
      if (pos.x >= cropArea.x && pos.x <= cropArea.x + cropArea.width &&
          pos.y >= cropArea.y && pos.y <= cropArea.y + cropArea.height) {
        setIsDragging(true);
        setStartPoint(pos);
        return;
      }
    }
    
    // Start new selection
    setIsSelecting(true);
    setStartPoint(pos);
    setCropArea({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getRelativePosition(e);
    
    if (isSelecting && cropArea) {
      const width = Math.abs(pos.x - startPoint.x);
      const height = Math.abs(pos.y - startPoint.y);
      const x = Math.min(pos.x, startPoint.x);
      const y = Math.min(pos.y, startPoint.y);
      
      setCropArea({
        x: Math.max(0, Math.min(x, imageSize.width - width)),
        y: Math.max(0, Math.min(y, imageSize.height - height)),
        width: Math.min(width, imageSize.width),
        height: Math.min(height, imageSize.height),
      });
    } else if (isDragging && cropArea) {
      const deltaX = pos.x - startPoint.x;
      const deltaY = pos.y - startPoint.y;
      
      setCropArea({
        ...cropArea,
        x: Math.max(0, Math.min(cropArea.x + deltaX, imageSize.width - cropArea.width)),
        y: Math.max(0, Math.min(cropArea.y + deltaY, imageSize.height - cropArea.height)),
      });
      setStartPoint(pos);
    } else if (isResizing && cropArea) {
      const deltaX = pos.x - startPoint.x;
      const deltaY = pos.y - startPoint.y;
      
      let newArea = { ...cropArea };
      
      switch (isResizing) {
        case 'nw':
          newArea.width = Math.max(20, cropArea.width - deltaX);
          newArea.height = Math.max(20, cropArea.height - deltaY);
          newArea.x = Math.max(0, cropArea.x + deltaX);
          newArea.y = Math.max(0, cropArea.y + deltaY);
          break;
        case 'ne':
          newArea.width = Math.max(20, cropArea.width + deltaX);
          newArea.height = Math.max(20, cropArea.height - deltaY);
          newArea.y = Math.max(0, cropArea.y + deltaY);
          break;
        case 'sw':
          newArea.width = Math.max(20, cropArea.width - deltaX);
          newArea.height = Math.max(20, cropArea.height + deltaY);
          newArea.x = Math.max(0, cropArea.x + deltaX);
          break;
        case 'se':
          newArea.width = Math.max(20, cropArea.width + deltaX);
          newArea.height = Math.max(20, cropArea.height + deltaY);
          break;
      }
      
      // Ensure crop area stays within image bounds
      newArea.width = Math.min(newArea.width, imageSize.width - newArea.x);
      newArea.height = Math.min(newArea.height, imageSize.height - newArea.y);
      
      setCropArea(newArea);
      setStartPoint(pos);
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setIsDragging(false);
    setIsResizing(null);
  };

  const resetCrop = () => {
    setCropArea(null);
  };

  const downloadCrop = () => {
    if (cropArea && cropArea.width > 0 && cropArea.height > 0 && originalImageSize.width > 0) {
      // Scale coordinates from displayed size to original image size
      const scaleX = originalImageSize.width / imageSize.width;
      const scaleY = originalImageSize.height / imageSize.height;
      
      const scaledCropArea = {
        x: Math.round(cropArea.x * scaleX),
        y: Math.round(cropArea.y * scaleY),
        width: Math.round(cropArea.width * scaleX),
        height: Math.round(cropArea.height * scaleY),
      };
      
      cropMutation.mutate(scaledCropArea);
    }
  };

  const getCursorStyle = (pos: { x: number; y: number }) => {
    if (!cropArea) return 'crosshair';
    
    const handleSize = 8;
    const handles = [
      { name: 'nw', x: cropArea.x - handleSize/2, y: cropArea.y - handleSize/2, cursor: 'nw-resize' },
      { name: 'ne', x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y - handleSize/2, cursor: 'ne-resize' },
      { name: 'sw', x: cropArea.x - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2, cursor: 'sw-resize' },
      { name: 'se', x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2, cursor: 'se-resize' },
    ];
    
    for (const handle of handles) {
      if (pos.x >= handle.x && pos.x <= handle.x + handleSize &&
          pos.y >= handle.y && pos.y <= handle.y + handleSize) {
        return handle.cursor;
      }
    }
    
    if (pos.x >= cropArea.x && pos.x <= cropArea.x + cropArea.width &&
        pos.y >= cropArea.y && pos.y <= cropArea.y + cropArea.height) {
      return 'move';
    }
    
    return 'crosshair';
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Crop Your Image</h2>
          <Button
            variant="ghost"
            onClick={onReplaceImage}
            className="text-blue-500 hover:text-blue-600"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Replace Image
          </Button>
        </div>

        <div className="text-center mb-6">
          <div className="text-sm text-slate-600 mb-4">
            {!cropArea ? "Click and drag to select crop area" : "Drag corners to resize, click inside to move"}
          </div>
          
          <div
            ref={containerRef}
            className="inline-block bg-slate-100 rounded-lg p-4 relative select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: 'crosshair' }}
          >
            <img
              ref={imageRef}
              src={`/api/images/${imageData.filename}`}
              alt="Uploaded image for cropping"
              className="max-w-full max-h-[80vh] rounded-lg shadow-sm block"
              draggable={false}
              style={{ cursor: 'crosshair' }}
            />
            
            {/* Crop Selection Overlay */}
            {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
              <>
                {/* Semi-transparent overlay */}
                <div className="absolute inset-4 bg-black bg-opacity-30 pointer-events-none" />
                
                {/* Clear crop area */}
                <div
                  className="absolute border-2 border-blue-500 bg-transparent"
                  style={{
                    left: cropArea.x + 16,
                    top: cropArea.y + 16,
                    width: cropArea.width,
                    height: cropArea.height,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
                    cursor: 'move'
                  }}
                >
                  {/* Resize handles */}
                  <div className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-nw-resize -top-1 -left-1" />
                  <div className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-ne-resize -top-1 -right-1" />
                  <div className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-sw-resize -bottom-1 -left-1" />
                  <div className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-se-resize -bottom-1 -right-1" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          {cropArea && (
            <div className="text-center text-sm text-slate-600">
              <span>Selection: {Math.round(cropArea.width)} × {Math.round(cropArea.height)} px</span>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetCrop}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
            <Button 
              onClick={downloadCrop}
              disabled={!cropArea || cropArea.width === 0 || cropArea.height === 0 || cropMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Download className="h-4 w-4 mr-2" />
              {cropMutation.isPending ? 'Processing...' : 'Download Cropped Image'}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Cropped Preview</h2>
          <div className="text-center">
            <div className="inline-block bg-slate-100 rounded-lg p-4">
              <div
                className="rounded-lg shadow-sm max-w-sm overflow-hidden"
                style={{
                  width: Math.min(cropArea.width, 300),
                  height: Math.min(cropArea.height, 300),
                  maxWidth: '100%',
                }}
              >
                <img
                  src={`/api/images/${imageData.filename}`}
                  alt="Cropped image preview"
                  className="object-cover w-full h-full"
                  style={{
                    transform: `translate(-${cropArea.x}px, -${cropArea.y}px)`,
                    width: imageSize.width,
                    height: imageSize.height,
                  }}
                />
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-600">
              Preview updates in real-time as you adjust the crop selection
            </div>
          </div>
        </div>
      )}
    </>
  );
}