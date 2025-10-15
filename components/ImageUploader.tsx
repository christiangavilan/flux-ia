import React, { useCallback, useRef, useState } from 'react';
import type { UploadedFile } from '../types';
import { UploadIcon, TrashIcon } from './icons';

interface ImageUploaderProps {
  uploadedImages: UploadedFile[];
  setUploadedImages: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ uploadedImages, setUploadedImages, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFiles = useCallback((files: File[]) => {
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          const base64 = e.target.result.split(',')[1];
          setUploadedImages(prev => [...prev, { base64, name: file.name, type: file.type }]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [setUploadedImages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(Array.from(event.target.files));
    }
  };

  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, [setUploadedImages]);
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDraggingOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (isLoading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      handleFiles(files);
      e.dataTransfer.clearData();
    }
  };

  const dropzoneClasses = `flex flex-col items-center justify-center w-full h-40 border-2 border-zinc-600 border-dashed rounded-lg transition-colors ${
    isLoading 
      ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
      : isDraggingOver
      ? 'bg-zinc-700 border-brand-primary'
      : 'cursor-pointer bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-500'
  }`;

  return (
    <div className="space-y-4">
      <div 
        onClick={!isLoading ? triggerFileInput : undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={dropzoneClasses}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
            <UploadIcon className="w-8 h-8 mb-4 text-gray-500" />
            <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click para subir</span> o arrastra y suelta</p>
            <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
        </div>
        <input ref={fileInputRef} id="dropzone-file" type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} disabled={isLoading} />
      </div>

      {uploadedImages.length > 0 && (
        <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400">Archivos Subidos:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group aspect-square">
                        <img src={`data:${image.type};base64,${image.base64}`} alt={image.name} className="w-full h-full object-cover rounded-md" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                            <button 
                                onClick={() => removeImage(index)} 
                                className="p-2 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                                disabled={isLoading}
                                aria-label="Remove image"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;