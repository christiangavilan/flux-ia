
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SparklesIcon, SpinnerIcon, CloseIcon, ZoomInIcon, ZoomOutIcon, ResetZoomIcon, SaveIcon, UploadIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon } from './icons';
import type { UploadedFile } from '../types';

interface GeneratedImageProps {
  generatedImages: string[] | null;
  activeImage: string | null;
  imageHistory: string[];
  activeImageIndex: number | null;
  uploadedImages: UploadedFile[];
  setUploadedImages: (files: UploadedFile[] | ((prevState: UploadedFile[]) => UploadedFile[])) => void;
  onSelectImage: (image: string) => void;
  onHistoryClick: (index: number) => void;
  isLoading: boolean;
  error: string | null;
  aspectRatio: string;
  onCancelSelection: () => void;
  onGoBackToSelection: () => void;
  onShowToast: (message: string) => void;
}

const loadingMessages = [
    "Identificando el producto...",
    "Eliminando el fondo original...",
    "Generando un nuevo fondo creativo...",
    "Aplicando estilos de iluminación...",
    "Realizando ajustes finales...",
    "Casi listo..."
];


const GeneratedImage: React.FC<GeneratedImageProps> = ({ 
    generatedImages, 
    activeImage, 
    imageHistory, 
    activeImageIndex,
    uploadedImages,
    setUploadedImages,
    onSelectImage, 
    onHistoryClick,
    isLoading, 
    error, 
    aspectRatio, 
    onCancelSelection, 
    onGoBackToSelection,
    onShowToast
}) => {
    const [messageIndex, setMessageIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
    const [isTransitioning, setIsTransitioning] = useState(false); // Controls CSS transition
    
    // Refs for smoother interaction logic
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragStartPosRef = useRef({ x: 0, y: 0 });

    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [urlError, setUrlError] = useState<string | null>(null);
    const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const MAX_ZOOM = 8;
    const MIN_ZOOM = 1;
    const ZOOM_STEP = 0.5;

    // Common styles for overlay buttons (Glassmorphism) with upgraded transitions
    const glassButtonBase = "bg-black/40 hover:bg-zinc-900/90 text-white/90 hover:text-white border border-white/10 hover:border-white/30 backdrop-blur-md shadow-lg transition-all duration-300 ease-out-expo";
    const overlayIconBtn = `p-2.5 rounded-full ${glassButtonBase}`;
    const overlayHiddenBtn = `${overlayIconBtn} opacity-0 group-hover:opacity-100 pointer-events-auto transform hover:scale-105`;

    useEffect(() => {
        if (isLoading) {
            setPreviewImageIndex(null); // Close modal automatically when a new generation starts
            const interval = setInterval(() => {
                setMessageIndex(prev => (prev + 1) % loadingMessages.length);
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [isLoading]);
    
    useEffect(() => {
        // Reset zoom when active image changes (either in main view or modal)
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setIsTransitioning(true);
    }, [activeImage, previewImageIndex]);

    const handleFiles = useCallback((files: File[]) => {
      const filesToProcess = files.filter(file => file.type.startsWith('image/'));
      if (filesToProcess.length === 0) return;
  
      const processFile = (file: File): Promise<UploadedFile> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
                const base64 = e.target.result.split(',')[1];
                const fileName = file.name || `pasted-image-${Date.now()}.${file.type.split('/')[1]}`;
                resolve({ base64, name: fileName, type: file.type });
            }
          };
          reader.readAsDataURL(file);
        });
      };
      
      Promise.all(filesToProcess.map(processFile)).then(processedFiles => {
        setUploadedImages(prev => [...prev, ...processedFiles]);
      });

    }, [setUploadedImages]);
    
    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
          if (isLoading) return;
          // Check if user is focusing on an input/textarea to avoid conflict
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
              return; 
          }

          const items = event.clipboardData?.items;
          if (!items) return;
    
          const imageFiles: File[] = [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) {
                imageFiles.push(file);
              }
            }
          }
    
          if (imageFiles.length > 0) {
            event.preventDefault();
            handleFiles(imageFiles);
          }
        };
        
        window.addEventListener('paste', handlePaste);
        return () => {
          window.removeEventListener('paste', handlePaste);
        };
      }, [isLoading, handleFiles]);
    

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        handleFiles(Array.from(event.target.files));
      }
    };
  
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

    // Drag and Drop for Reordering Uploaded Images
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOverItem = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDropItem = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const newImages = [...uploadedImages];
        const [draggedItem] = newImages.splice(draggedIndex, 1);
        newImages.splice(dropIndex, 0, draggedItem);

        setUploadedImages(newImages);
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // Helper to clean and split input based on multiple delimiters
    const parseSkus = useCallback((input: string) => {
        // Handles newlines (Excel copy-paste), tabs, commas, semicolons, pipes, and multiple spaces
        const delimiters = /[\n\t\s,;|]+/;
        return input.split(delimiters).map(sku => sku.trim()).filter(Boolean);
    }, []);

    const handleInputBlur = () => {
        const skus = parseSkus(imageUrl);
        if (skus.length > 0) {
            // Auto-format on blur to give user feedback
            const formattedInput = skus.join(', ');
            if (imageUrl !== formattedInput) {
                setImageUrl(formattedInput);
            }
        }
    };
    
    const handleUrlUpload = useCallback(async () => {
        if (!imageUrl.trim() || isLoading) return;
    
        setUrlError(null);

        // Robust parsing
        const skus = parseSkus(imageUrl);
        
        if (skus.length === 0) return;

        // Auto-format the input field to a clean comma-separated list immediately
        const formattedInput = skus.join(', ');
        if (imageUrl !== formattedInput) {
            setImageUrl(formattedInput);
        }
    
        // --- SKU DUPLICATION VALIDATION ---
        // Normalize existing SKUs by removing file extensions.
        const existingSkus = new Set(uploadedImages.map(img => img.name.split('.')[0]));
        
        // Normalize input SKUs and check for duplicates within the input list.
        const inputSkus = new Set<string>();
        const duplicatesInInput: string[] = [];
        skus.forEach(sku => {
            const normalizedSku = sku.split('.')[0];
            if (inputSkus.has(normalizedSku)) {
                duplicatesInInput.push(normalizedSku);
            }
            inputSkus.add(normalizedSku);
        });
    
        // Check for SKUs that are already uploaded.
        const alreadyUploaded = Array.from(inputSkus).filter(sku => existingSkus.has(sku));
    
        if (duplicatesInInput.length > 0 || alreadyUploaded.length > 0) {
            let errorParts: string[] = [];
            if (duplicatesInInput.length > 0) {
                errorParts.push(`SKUs repetidos en la entrada: ${[...new Set(duplicatesInInput)].join(', ')}.`);
            }
            if (alreadyUploaded.length > 0) {
                errorParts.push(`SKUs que ya han sido cargados: ${[...new Set(alreadyUploaded)].join(', ')}.`);
            }
            setUrlError(`${errorParts.join(' ')} Por favor, elimina los duplicados para continuar.`);
            return;
        }
        // --- END VALIDATION ---

        const processSingleUrl = async (sku: string): Promise<UploadedFile | string> => {
            const PROXY_URL = 'https://corsproxy.io/?';
            const BASE_URLS = [
                'https://media.falabella.com/falabellaCL',
                'https://media.falabella.com/sodimacCL'
            ];
            const imagePath = sku.startsWith('/') ? sku : `/${sku}`;
    
            let response: Response | null = null;
            let finalUrl = '';
    
            for (const baseUrl of BASE_URLS) {
                const targetUrl = `${baseUrl}${imagePath}`;
                const proxiedUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;
                try {
                    const res = await fetch(proxiedUrl);
                    if (res.ok) {
                        response = res;
                        finalUrl = targetUrl;
                        break;
                    }
                } catch (error) {
                    console.warn(`Could not fetch from ${proxiedUrl} for SKU ${sku}, trying next.`, error);
                }
            }
    
            if (!response || !response.ok) {
                return `SKU '${sku}' no encontrado.`;
            }
    
            try {
                const blob = await response.blob();
                if (!blob.type.startsWith('image/')) {
                    return `La URL para '${sku}' no es una imagen.`;
                }
    
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (typeof e.target?.result === 'string') {
                            const base64 = e.target.result.split(',')[1];
                            const name = finalUrl.substring(finalUrl.lastIndexOf('/') + 1) || `image-${sku}.jpg`;
                            resolve({ base64, name, type: blob.type });
                        }
                    };
                    reader.onerror = () => {
                        resolve(`Error al procesar la imagen para '${sku}'.`);
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error(`Error loading image from URL for SKU ${sku}:`, error);
                return error instanceof Error ? error.message : `Error desconocido para SKU '${sku}'.`;
            }
        };
    
        const results = await Promise.all(skus.map(processSingleUrl));
        const newImages: UploadedFile[] = [];
        const errors: string[] = [];

        results.forEach(result => {
            if (typeof result === 'string') {
                errors.push(result);
            } else {
                newImages.push(result);
            }
        });

        if (newImages.length > 0) {
            setUploadedImages(prevImages => [...prevImages, ...newImages]);
        }
    
        if (errors.length > 0) {
            setUrlError(errors.join(' '));
        }
    
        if (errors.length < skus.length) {
            setImageUrl('');
        }
    }, [imageUrl, isLoading, setUploadedImages, uploadedImages, parseSkus]);
    
    const removeImage = useCallback((indexToRemove: number) => {
        setUploadedImages(prevImages => prevImages.filter((_, i) => i !== indexToRemove));
    }, [setUploadedImages]);


    const getAspectRatioClass = (ratio: string) => {
        switch (ratio) {
            case '1:1': return 'aspect-square';
            case '4:5': return 'aspect-[4/5]';
            case '16:9': return 'aspect-video';
            case '9:16': return 'aspect-[9/16]';
            case '2:3': return 'aspect-[2/3]';
            case '3:2': return 'aspect-[3/2]';
            case '3:4': return 'aspect-[3/4]';
            case '4:3': return 'aspect-[4/3]';
            case '21:9': return 'aspect-[21/9]';
            default: return 'aspect-square';
        }
    };
    
    const downloadImage = (imageToDownload: string | null) => {
        if(imageToDownload) {
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${imageToDownload}`;
            link.download = `ai-product-photo-${new Date().toISOString()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const copyToClipboard = async (imageToCopy: string | null) => {
        if (!imageToCopy) return;
        
        try {
            const byteCharacters = atob(imageToCopy);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            onShowToast("Imagen copiada al portapapeles");
        } catch (err) {
            console.error('Failed to copy: ', err);
            onShowToast("Error al copiar imagen");
        }
    };

    // --- Enhanced Zoom & Pan Logic ---

    const clampPosition = (pos: {x: number, y: number}, currentZoom: number) => {
        if (!imageContainerRef.current) return pos;
        const rect = imageContainerRef.current.getBoundingClientRect();
        
        // Calculate the boundary limits
        // The image is scaled from the center. 
        // Total Scaled Width = rect.width * currentZoom
        // Overflow (one side) = (Total Scaled Width - rect.width) / 2
        
        const maxOffsetX = (rect.width * (currentZoom - 1)) / 2;
        const maxOffsetY = (rect.height * (currentZoom - 1)) / 2;

        if (currentZoom <= 1) return { x: 0, y: 0 };
        
        return {
            x: Math.max(-maxOffsetX, Math.min(pos.x, maxOffsetX)),
            y: Math.max(-maxOffsetY, Math.min(pos.y, maxOffsetY))
        };
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!imageContainerRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        // Disable transition for instant wheel response
        setIsTransitioning(false);

        const rect = imageContainerRef.current.getBoundingClientRect();
        
        // Calculate mouse position relative to the center
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        
        // Multiplicative Zoom for consistent speed
        const zoomFactor = 1 - e.deltaY * 0.002; 
        let newZoom = zoom * zoomFactor;
        
        // Clamp zoom
        newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));
        
        if (Math.abs(newZoom - zoom) < 0.01) return;

        // Calculate new position to keep the point under mouse stable
        const scaleRatio = newZoom / zoom;
        const newX = mouseX - (mouseX - position.x) * scaleRatio;
        const newY = mouseY - (mouseY - position.y) * scaleRatio;
        
        setZoom(newZoom);
        setPosition(clampPosition({ x: newX, y: newY }, newZoom));
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only allow panning if zoomed in
        if (zoom > MIN_ZOOM) {
            e.preventDefault();
            setIsPanning(true);
            setIsTransitioning(false); // Disable transition during drag
            setStartPanPosition({ x: e.clientX, y: e.clientY });
            dragStartPosRef.current = { x: position.x, y: position.y };
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning) return;
        e.preventDefault();
        
        const deltaX = e.clientX - startPanPosition.x;
        const deltaY = e.clientY - startPanPosition.y;
        
        // Apply delta 1:1 to the starting position
        const newPos = { 
            x: dragStartPosRef.current.x + deltaX,
            y: dragStartPosRef.current.y + deltaY,
        };
        
        setPosition(clampPosition(newPos, zoom));
    };

    const handleMouseUpOrLeave = () => { setIsPanning(false); };
    
    const handleZoomAction = (direction: 'in' | 'out' | 'reset') => {
        setIsTransitioning(true); // Enable smooth transition for clicks
        if (direction === 'reset') {
            setZoom(MIN_ZOOM);
            setPosition({ x: 0, y: 0 });
            return;
        }

        const newZoom = Math.max(MIN_ZOOM, Math.min(zoom + (direction === 'in' ? ZOOM_STEP : -ZOOM_STEP), MAX_ZOOM));

        if (newZoom <= MIN_ZOOM) {
            handleZoomAction('reset');
        } else {
            setZoom(newZoom);
            setPosition(clampPosition(position, newZoom));
        }
    };

    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsTransitioning(true); // Smooth transition for double click

        if (zoom > 1) {
            // Reset to fit
            setZoom(MIN_ZOOM);
            setPosition({ x: 0, y: 0 });
        } else {
            // Zoom in to 3x (or max) focused on center (simplification)
            // Ideally could zoom to cursor, but center is safe for double click
            setZoom(Math.min(3, MAX_ZOOM));
        }
    };

    // ---------------------------------

    const handleNextPreview = useCallback(() => {
        if (generatedImages) {
            setPreviewImageIndex(prev => (prev === null ? 0 : (prev + 1) % generatedImages.length));
        }
    }, [generatedImages]);

    const handlePrevPreview = useCallback(() => {
        if (generatedImages) {
            setPreviewImageIndex(prev => (prev === null ? 0 : (prev - 1 + generatedImages.length) % generatedImages.length));
        }
    }, [generatedImages]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (previewImageIndex !== null) {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    handleNextPreview();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    handlePrevPreview();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setPreviewImageIndex(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [previewImageIndex, handleNextPreview, handlePrevPreview]);

    const containerClasses = `w-full ${getAspectRatioClass(aspectRatio)} bg-zinc-800/50 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-700 transition-all duration-300 ease-out-expo`;

    if (isLoading) {
        return (
            <div className={containerClasses}>
                <div className="flex flex-col items-center text-center p-4 animate-pulse-slow">
                    <SpinnerIcon className="w-12 h-12 mb-4" />
                    <p className="text-lg font-semibold text-gray-200">Generando Magia...</p>
                    <p className="text-gray-400 mt-1 transition-opacity duration-500">{loadingMessages[messageIndex]}</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className={containerClasses}>
                <div className="text-center p-4 animate-fade-in">
                    <p className="text-red-400 font-semibold">Error</p>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (activeImage) {
        const cursorClass = zoom > MIN_ZOOM ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in';
        // Conditional transition: smooth for buttons/double-click, instant for drag/wheel
        const transitionStyle = isTransitioning ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none';

        return (
            <div className="w-full h-full flex flex-col justify-center gap-4 animate-fade-in">
                <div 
                    ref={imageContainerRef}
                    className={`relative group w-full ${getAspectRatioClass(aspectRatio)} mx-auto rounded-lg overflow-hidden bg-zinc-900 select-none shadow-2xl`}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    onDoubleClick={handleDoubleClick}
                >
                    <img 
                        src={`data:image/png;base64,${activeImage}`} 
                        alt="Generated product" 
                        className={`${cursorClass}`}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transformOrigin: 'center center',
                            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                            transition: transitionStyle,
                            willChange: 'transform'
                        }}
                        draggable={false}
                    />
                    
                    {generatedImages && generatedImages.length > 1 && (
                         <button
                            onClick={onGoBackToSelection}
                            className={`absolute top-4 left-4 z-10 ${overlayHiddenBtn}`}
                            aria-label="Volver a la selección"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                            </svg>
                        </button>
                    )}

                     <div className={`absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}>
                        <button
                            onClick={() => copyToClipboard(activeImage)}
                            className={`${overlayIconBtn} transform hover:scale-105 pointer-events-auto`}
                            aria-label="Copiar imagen"
                            title="Copiar al portapapeles"
                        >
                            <CopyIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => downloadImage(activeImage)}
                            className={`${overlayIconBtn} transform hover:scale-105 pointer-events-auto`}
                            aria-label="Descargar imagen"
                            title="Descargar imagen"
                        >
                            <SaveIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className={`absolute bottom-4 right-4 z-20 flex items-center ${glassButtonBase} rounded-full opacity-0 group-hover:opacity-100 pointer-events-auto p-1`}>
                        <button onClick={() => handleZoomAction('out')} disabled={zoom === MIN_ZOOM} className="p-2 text-white/70 hover:text-white rounded-full transition-colors disabled:opacity-30 hover:bg-white/10" aria-label="Zoom out">
                            <ZoomOutIcon className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-0.5"></div>
                        <button onClick={() => handleZoomAction('reset')} disabled={zoom === MIN_ZOOM} className="p-2 text-white/70 hover:text-white rounded-full transition-colors disabled:opacity-30 hover:bg-white/10" aria-label="Reset zoom">
                            <ResetZoomIcon className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-0.5"></div>
                        <button onClick={() => handleZoomAction('in')} disabled={zoom === MAX_ZOOM} className="p-2 text-white/70 hover:text-white rounded-full transition-colors disabled:opacity-30 hover:bg-white/10" aria-label="Zoom in">
                            <ZoomInIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                {imageHistory.length > 1 && (
                    <div className="mt-2 pt-4 border-t border-zinc-700 animate-slide-up animate-delay-100">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-3">Historial de Cambios</h4>
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                            {imageHistory.map((img, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => onHistoryClick(index)}
                                    className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden focus:outline-none transition-all duration-200 ${index === activeImageIndex ? 'ring-2 ring-brand-primary ring-offset-2 ring-offset-zinc-900 opacity-100 scale-105' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                                    aria-label={`Versión ${index + 1}`}
                                >
                                    <img src={`data:image/png;base64,${img}`} alt={`Versión ${index + 1}`} className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-md">
                                        {index + 1}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    if (generatedImages && generatedImages.length > 0) {
        const cursorClass = zoom > MIN_ZOOM ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in';
        const transitionStyle = isTransitioning ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none';
        const previewImage = previewImageIndex !== null ? generatedImages[previewImageIndex] : null;

        return (
            <>
                <div className="w-full relative animate-fade-in">
                    <button
                        onClick={onCancelSelection}
                        className="absolute -top-3 -right-3 z-10 p-2 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 rounded-full shadow-lg transition-all hover:scale-105"
                        aria-label="Cerrar vista previa"
                    >
                        <CloseIcon className="w-4 h-4" />
                    </button>
                    <p className="text-center text-gray-400 mb-4 font-medium">Elige tu imagen preferida para continuar:</p>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4`}>
                        {generatedImages.map((image, index) => (
                            <div 
                                key={index} 
                                className={`relative group cursor-pointer overflow-hidden rounded-lg border-2 border-zinc-700 hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all duration-300 ease-out-expo ${getAspectRatioClass(aspectRatio)}`}
                                onClick={() => setPreviewImageIndex(index)}
                                role="button"
                                tabIndex={0}
                                aria-label={`Previsualizar opción ${index + 1}`}
                                onKeyDown={(e) => e.key === 'Enter' && setPreviewImageIndex(index)}
                            >
                                <img src={`data:image/png;base64,${image}`} alt={`Opción ${index + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/60 transition-all flex flex-col items-center justify-center text-white p-2 text-center backdrop-blur-[2px] opacity-0 group-hover:opacity-100 duration-300">
                                    <div className="transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out-expo flex flex-col items-center">
                                        <ZoomInIcon className="w-8 h-8 mb-2 text-brand-primary" />
                                        <span className="font-bold text-lg block">Ver Detalle</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {previewImage && createPortal(
                <div 
                    className="fixed inset-0 bg-black flex flex-col z-[100] animate-scale-in"
                    onClick={() => setPreviewImageIndex(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="preview-modal-title"
                >
                     <h2 id="preview-modal-title" className="sr-only">Previsualización de Imagen</h2>
                    
                    {/* Top Controls */}
                    <button
                        onClick={() => setPreviewImageIndex(null)}
                        className={`absolute top-6 right-6 z-30 p-3 rounded-full bg-black/40 hover:bg-zinc-800 text-white/80 hover:text-white border border-white/10 transition-all hover:scale-110`}
                        aria-label="Cerrar previsualización"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>

                     {/* Navigation - Absolute Center Vertical */}
                     <button 
                        onClick={(e) => { e.stopPropagation(); handlePrevPreview(); }}
                        className="absolute left-6 top-1/2 -translate-y-1/2 z-[51] p-4 bg-black/20 hover:bg-black/50 text-white/50 hover:text-white rounded-full transition-all hidden sm:block hover:scale-110 backdrop-blur-sm"
                        aria-label="Imagen anterior"
                    >
                        <ChevronLeftIcon className="w-10 h-10" />
                    </button>

                    <button 
                        onClick={(e) => { e.stopPropagation(); handleNextPreview(); }}
                        className="absolute right-6 top-1/2 -translate-y-1/2 z-[51] p-4 bg-black/20 hover:bg-black/50 text-white/50 hover:text-white rounded-full transition-all hidden sm:block hover:scale-110 backdrop-blur-sm"
                        aria-label="Siguiente imagen"
                    >
                        <ChevronRightIcon className="w-10 h-10" />
                    </button>

                    {/* Main Image Area */}
                    <div 
                        className="flex-grow w-full h-full relative flex items-center justify-center overflow-hidden p-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div 
                            ref={imageContainerRef}
                            className={`relative group w-full h-full flex items-center justify-center select-none`}
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                            onDoubleClick={handleDoubleClick}
                        >
                            <img 
                                src={`data:image/png;base64,${previewImage}`} 
                                alt="Previsualización de producto generado" 
                                className={`${cursorClass} max-w-full max-h-full`}
                                style={{
                                    transformOrigin: 'center center',
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                    transition: transitionStyle,
                                    willChange: 'transform'
                                }}
                                draggable={false}
                            />
                            
                            {/* Floating Zoom Controls */}
                            <div className={`absolute bottom-24 right-8 z-20 flex items-center ${glassButtonBase} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto p-1.5 scale-110`}>
                                <button onClick={() => handleZoomAction('out')} disabled={zoom === MIN_ZOOM} className="p-2 text-white/70 hover:text-white rounded-full transition-colors disabled:opacity-30 hover:bg-white/10" aria-label="Zoom out"><ZoomOutIcon className="w-5 h-5" /></button>
                                <div className="w-px h-5 bg-white/10 mx-1"></div>
                                <button onClick={() => handleZoomAction('reset')} disabled={zoom === MIN_ZOOM} className="p-2 text-white/70 hover:text-white rounded-full transition-colors disabled:opacity-30 hover:bg-white/10" aria-label="Reset zoom"><ResetZoomIcon className="w-5 h-5" /></button>
                                <div className="w-px h-5 bg-white/10 mx-1"></div>
                                <button onClick={() => handleZoomAction('in')} disabled={zoom === MAX_ZOOM} className="p-2 text-white/70 hover:text-white rounded-full transition-colors disabled:opacity-30 hover:bg-white/10" aria-label="Zoom in"><ZoomInIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                        
                    {/* Bottom Action Bar */}
                    <div className="w-full p-6 bg-black/40 backdrop-blur-xl border-t border-white/5 flex justify-center items-center gap-4 z-50 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => {
                                onSelectImage(previewImage);
                                setPreviewImageIndex(null);
                            }}
                            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-brand-primary/20 hover:-translate-y-0.5 hover:scale-105 duration-300 ease-out-expo"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            Usar esta imagen
                        </button>
                        <button
                            onClick={() => copyToClipboard(previewImage)}
                            className="bg-white/5 hover:bg-white/10 text-gray-200 font-bold py-3 px-4 rounded-full border border-white/10 flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 hover:scale-105 duration-300 ease-out-expo"
                            title="Copiar al portapapeles"
                        >
                            <CopyIcon className="w-5 h-5" />
                            Copiar
                        </button>
                        <button
                            onClick={() => downloadImage(previewImage)}
                            className="bg-white/5 hover:bg-white/10 text-gray-200 font-bold py-3 px-8 rounded-full border border-white/10 flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 hover:scale-105 duration-300 ease-out-expo"
                        >
                            <SaveIcon className="w-5 h-5" />
                            Descargar
                        </button>
                    </div>

                </div>, document.body)}
            </>
        );
    }
    
    const dropzoneClasses = `w-full flex-grow flex flex-col justify-center p-6 border-2 border-dashed rounded-xl transition-all duration-300 ease-out-expo
    ${ isDraggingOver
      ? 'bg-zinc-800 border-brand-primary scale-[1.02] shadow-lg shadow-brand-primary/10'
      : 'cursor-pointer bg-zinc-800/30 border-zinc-700 hover:bg-zinc-800/50 hover:border-zinc-500'
    }`;

    return (
        <div className="flex flex-col h-full gap-6">
            {uploadedImages.length > 0 && (
            <div className="space-y-2 animate-fade-in">
                <div className="flex justify-between items-end">
                     <h4 className="text-xs uppercase tracking-wider font-bold text-gray-500">Archivos Subidos ({uploadedImages.length})</h4>
                     <button onClick={() => setUploadedImages([])} className="text-xs text-red-400 hover:text-red-300 underline">Limpiar todo</button>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {uploadedImages.map((image, index) => (
                        <div 
                            key={index} 
                            className={`relative group aspect-square w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-zinc-700 transition-all duration-200 ease-out-expo 
                                ${draggedIndex === index ? 'opacity-40 scale-95' : 'hover:border-brand-primary'}
                                ${isLoading ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
                            `}
                            draggable={!isLoading}
                            onDragStart={(e) => !isLoading && handleDragStart(e, index)}
                            onDragOver={(e) => !isLoading && handleDragOverItem(e)}
                            onDrop={(e) => !isLoading && handleDropItem(e, index)}
                            onDragEnd={handleDragEnd}
                        >
                            <img src={`data:${image.type};base64,${image.base64}`} alt={image.name} className="w-full h-full object-cover pointer-events-none" />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeImage(index); }} 
                                    className="absolute top-1 right-1 p-1.5 bg-black/40 hover:bg-red-500/90 text-white border border-white/10 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-90 group-hover:scale-100 shadow-sm ease-out-expo"
                                    disabled={isLoading}
                                    aria-label="Remove image"
                                >
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            </div>
                             <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">
                                {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            )}

            <div className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-700/50">
                <label htmlFor="image-url-input" className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    Importar desde Falabella / Sodimac (Excel compatible)
                </label>
                <div className="flex rounded-lg shadow-sm items-start">
                    <div className="relative flex-grow">
                        <textarea
                            id="image-url-input"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            onBlur={handleInputBlur}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleUrlUpload();
                                }
                            }}
                            placeholder="Ej: 88195623, 11223344... (Copia lista de SKUs)"
                            disabled={isLoading}
                            rows={1}
                            className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 border-r-0 rounded-l-lg text-gray-200 placeholder-gray-500 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-all resize-y min-h-[42px]"
                        />
                    </div>
                    <button
                        onClick={handleUrlUpload}
                        disabled={isLoading || !imageUrl.trim()}
                        className="inline-flex items-center px-4 py-2 border border-l-0 border-zinc-700 rounded-r-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-auto self-stretch"
                    >
                        {isLoading ? <SpinnerIcon className="w-4 h-4" /> : "Cargar"}
                    </button>
                </div>
                {urlError && (
                    <div className="mt-2 p-2 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-xs flex items-start gap-2 animate-fade-in">
                        <span className="mt-0.5 text-red-500">⚠</span>
                        {urlError}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 px-2">
                <hr className="flex-grow border-t border-zinc-700" />
                <span className="text-zinc-600 text-xs font-bold uppercase">O subir archivo</span>
                <hr className="flex-grow border-t border-zinc-700" />
            </div>

            <div 
                className={dropzoneClasses}
                onClick={!isLoading ? triggerFileInput : undefined}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <div className={`p-3 rounded-full bg-zinc-800 transition-colors duration-300 ${isDraggingOver ? 'text-brand-primary' : 'text-gray-500'}`}>
                        <UploadIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-300">
                            <span className="text-brand-primary hover:underline">Haz click para subir</span> o arrastra aquí
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Soporta: PNG, JPG, WEBP</p>
                        <p className="text-xs text-gray-600 mt-1">También puedes pegar (Ctrl+V)</p>
                    </div>
                </div>
                <input ref={fileInputRef} id="direct-upload-file" type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} disabled={isLoading} />
            </div>

        </div>
    );
};

export default GeneratedImage;
