import { useState } from "react";
import ImageUpload from "@/components/image-upload";
import ImageCrop from "@/components/image-crop";

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: string;
  } | null>(null);

  const handleImageUploaded = (imageData: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: string;
  }) => {
    setUploadedImage(imageData);
  };

  const handleReplaceImage = () => {
    setUploadedImage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">ImageCrop</h1>
          <p className="text-slate-600 text-lg">Simple and intuitive image cropping tool</p>
        </header>

        <div className="space-y-8">
          
          {/* Upload Section */}
          {!uploadedImage && (
            <ImageUpload onImageUploaded={handleImageUploaded} />
          )}

          {/* Crop Section */}
          {uploadedImage && (
            <ImageCrop 
              imageData={uploadedImage} 
              onReplaceImage={handleReplaceImage}
            />
          )}

          {/* Instructions */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">
              <i className="fas fa-info-circle mr-2"></i>How to Use
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-700">
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                <div>
                  <p className="font-medium">Upload Image</p>
                  <p className="text-blue-600">Drag & drop or click to select your image file</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                <div>
                  <p className="font-medium">Select Crop Area</p>
                  <p className="text-blue-600">Drag the corners to resize the selection rectangle</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                <div>
                  <p className="font-medium">Download Result</p>
                  <p className="text-blue-600">Click download to save your cropped image</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
