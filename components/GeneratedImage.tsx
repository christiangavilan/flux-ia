
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SparklesIcon, SpinnerIcon, CloseIcon, ZoomInIcon, ZoomOutIcon, ResetZoomIcon, SaveIcon, UploadIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
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
    onGoBackToSelection
}) => {
    const [messageIndex, setMessageIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [urlError, setUrlError] = useState<string | null>(null);
    const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

    const MAX_ZOOM = 10;
    const MIN_ZOOM = 1;
    const ZOOM_STEP = 0.5;

    useEffect(() => {
        if (isLoading) {
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
    
    const handleUrlUpload = useCallback(async () => {
        if (!imageUrl.trim() || isLoading) return;
    
        setUrlError(null);
        const skus = imageUrl.split(',').map(sku => sku.trim()).filter(Boolean);
        if (skus.length === 0) return;
    
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
    }, [imageUrl, isLoading, setUploadedImages, uploadedImages]);
    
    const removeImage = useCallback((indexToRemove: number) => {
        setUploadedImages(prevImages => prevImages.filter((_, i) => i !== indexToRemove));
    }, [setUploadedImages]);


    const getAspectRatioClass = (ratio: string) => {
        switch (ratio) {
            case '1:1': return 'aspect-square';
            case '4:5': return 'aspect-[4/5]';
            case '16:9': return 'aspect-video';
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
    }

    const clampPosition = (pos: {x: number, y: number}, currentZoom: number) => {
        if (!imageContainerRef.current) return pos;
        const rect = imageContainerRef.current.getBoundingClientRect();
        const maxOffsetX = Math.max(0, (rect.width * currentZoom - rect.width) / (2 * currentZoom));
        const maxOffsetY = Math.max(0, (rect.height * currentZoom - rect.height) / (2 * currentZoom));
        
        return {
            x: Math.max(-maxOffsetX, Math.min(pos.x, maxOffsetX)),
            y: Math.max(-maxOffsetY, Math.min(pos.y, maxOffsetY))
        };
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!imageContainerRef.current) return;
        e.preventDefault();

        const rect = imageContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const oldZoom = zoom;
        const newZoom = Math.max(MIN_ZOOM, Math.min(zoom - e.deltaY * 0.01, MAX_ZOOM));
        if (newZoom === oldZoom) return;

        const containerX = (mouseX - position.x * oldZoom);
        const containerY = (mouseY - position.y * oldZoom);

        const newX = (containerX / newZoom) - (mouseX / newZoom) + position.x;
        const newY = (containerY / newZoom) - (mouseY / newZoom) + position.y;
        
        if (newZoom <= MIN_ZOOM) {
            setZoom(MIN_ZOOM);
            setPosition({ x: 0, y: 0 });
        } else {
            setZoom(newZoom);
            setPosition(clampPosition({ x: newX, y: newY }, newZoom));
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (zoom > MIN_ZOOM) {
            e.preventDefault();
            setIsPanning(true);
            setStartPanPosition({ x: e.clientX - position.x * zoom, y: e.clientY - position.y * zoom });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning) return;
        e.preventDefault();
        const newPos = { 
            x: (e.clientX - startPanPosition.x) / zoom,
            y: (e.clientY - startPanPosition.y) / zoom,
        };
        setPosition(clampPosition(newPos, zoom));
    };

    const handleMouseUpOrLeave = () => { setIsPanning(false); };
    
    const handleZoomAction = (direction: 'in' | 'out' | 'reset') => {
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

    const containerClasses = `w-full ${getAspectRatioClass(aspectRatio)} bg-zinc-800/50 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-700 transition-all`;

    if (isLoading) {
        return (
            <div className={containerClasses}>
                <div className="flex flex-col items-center text-center p-4">
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
                <div className="text-center p-4">
                    <p className="text-red-400 font-semibold">Error</p>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (activeImage) {
        const cursorClass = zoom > MIN_ZOOM ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in';
        return (
            <div className="w-full h-full flex flex-col justify-center gap-4">
                <div 
                    ref={imageContainerRef}
                    className={`relative group w-full ${getAspectRatioClass(aspectRatio)} mx-auto rounded-lg overflow-hidden bg-zinc-900 select-none`}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                >
                    <img 
                        src={`data:image/png;base64,${activeImage}`} 
                        alt="Generated product" 
                        className={`transition-transform duration-100 ease-out ${cursorClass}`}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transformOrigin: 'center center',
                            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                            willChange: 'transform'
                        }}
                        draggable={false}
                    />
                    
                    {generatedImages && generatedImages.length > 1 && (
                         <button
                            onClick={onGoBackToSelection}
                            className="absolute top-3 left-3 z-10 p-2 bg-zinc-800/70 hover:bg-zinc-700 rounded-full text-gray-200 transition-all opacity-0 group-hover:opacity-100 pointer-events-auto"
                            aria-label="Volver a la selección"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                            </svg>
                        </button>
                    )}

                    <button
                        onClick={() => downloadImage(activeImage)}
                        className="absolute top-3 right-3 z-10 p-2 bg-zinc-800/70 hover:bg-zinc-700 rounded-full text-gray-200 transition-all opacity-0 group-hover:opacity-100 pointer-events-auto"
                        aria-label="Descargar imagen"
                    >
                        <SaveIcon className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-zinc-900/70 backdrop-blur-sm p-1.5 rounded-lg shadow-lg transition-all opacity-0 group-hover:opacity-100 pointer-events-auto">
                        <button onClick={() => handleZoomAction('out')} disabled={zoom === MIN_ZOOM} className="p-1 text-gray-200 hover:bg-zinc-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Zoom out"><ZoomOutIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleZoomAction('reset')} disabled={zoom === MIN_ZOOM} className="p-1 text-gray-200 hover:bg-zinc-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Reset zoom"><ResetZoomIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleZoomAction('in')} disabled={zoom === MAX_ZOOM} className="p-1 text-gray-200 hover:bg-zinc-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Zoom in"><ZoomInIcon className="w-5 h-5" /></button>
                    </div>
                </div>
                
                {imageHistory.length > 1 && (
                    <div className="mt-2 pt-4 border-t border-zinc-700">
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Historial de Cambios:</h4>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {imageHistory.map((img, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => onHistoryClick(index)}
                                    className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-brand-primary transition-all ${index === activeImageIndex ? 'ring-2 ring-brand-primary' : 'ring-2 ring-transparent hover:ring-zinc-500'}`}
                                    aria-label={`Versión ${index + 1}`}
                                >
                                    <img src={`data:image/png;base64,${img}`} alt={`Versión ${index + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all"></div>
                                    <span className="absolute bottom-1 right-1 bg-black/50 text-white text-xs font-bold px-1.5 py-0.5 rounded">
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
        const previewImage = previewImageIndex !== null ? generatedImages[previewImageIndex] : null;

        return (
            <>
                <div className="w-full relative">
                    <button
                        onClick={onCancelSelection}
                        className="absolute -top-4 -right-4 z-10 p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-full text-gray-300 transition-colors"
                        aria-label="Cerrar vista previa"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                    <p className="text-center text-gray-400 mb-4 font-medium">Elige tu imagen preferida para continuar:</p>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4`}>
                        {generatedImages.map((image, index) => (
                            <div 
                                key={index} 
                                className={`relative group cursor-pointer overflow-hidden rounded-lg border-2 border-zinc-700 hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all ${getAspectRatioClass(aspectRatio)}`}
                                onClick={() => setPreviewImageIndex(index)}
                                role="button"
                                tabIndex={0}
                                aria-label={`Previsualizar opción ${index + 1}`}
                                onKeyDown={(e) => e.key === 'Enter' && setPreviewImageIndex(index)}
                            >
                                <img src={`data:image/png;base64,${image}`} alt={`Opción ${index + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex flex-col items-center justify-center text-white p-2 text-center">
                                    <span className="font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity">Opción {index + 1}</span>
                                    <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity mt-1">Click para previsualizar</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {previewImage && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
                    onClick={() => setPreviewImageIndex(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="preview-modal-title"
                >
                     <button 
                        onClick={(e) => { e.stopPropagation(); handlePrevPreview(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-[51] p-2 bg-zinc-800/70 hover:bg-zinc-700 rounded-full text-gray-200 transition-all hidden sm:block"
                        aria-label="Imagen anterior"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>

                    <div 
                        className="relative w-full max-w-4xl max-h-full flex flex-col gap-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                         <h2 id="preview-modal-title" className="sr-only">Previsualización de Imagen</h2>
                        <div 
                            ref={imageContainerRef}
                            className={`relative group w-full ${getAspectRatioClass(aspectRatio)} mx-auto rounded-lg overflow-hidden bg-zinc-900 select-none`}
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                        >
                            <img 
                                src={`data:image/png;base64,${previewImage}`} 
                                alt="Previsualización de producto generado" 
                                className={`transition-transform duration-100 ease-out ${cursorClass}`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    transformOrigin: 'center center',
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                    willChange: 'transform'
                                }}
                                draggable={false}
                            />
                            
                            <button
                                onClick={() => setPreviewImageIndex(null)}
                                className="absolute top-3 right-3 z-30 p-2 bg-zinc-800/70 hover:bg-zinc-700 rounded-full text-gray-200 transition-all"
                                aria-label="Cerrar previsualización"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>

                            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-zinc-900/70 backdrop-blur-sm p-1.5 rounded-lg shadow-lg">
                                <button onClick={() => handleZoomAction('out')} disabled={zoom === MIN_ZOOM} className="p-1 text-gray-200 hover:bg-zinc-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Zoom out"><ZoomOutIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleZoomAction('reset')} disabled={zoom === MIN_ZOOM} className="p-1 text-gray-200 hover:bg-zinc-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Reset zoom"><ResetZoomIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleZoomAction('in')} disabled={zoom === MAX_ZOOM} className="p-1 text-gray-200 hover:bg-zinc-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Zoom in"><ZoomInIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        
                        <div className="flex justify-center items-center gap-4">
                            <button
                                onClick={() => {
                                    onSelectImage(previewImage);
                                    setPreviewImageIndex(null);
                                }}
                                className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition-all"
                            >
                                <SparklesIcon className="w-5 h-5" />
                                Usar esta imagen
                            </button>
                            <button
                                onClick={() => downloadImage(previewImage)}
                                className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition-all"
                            >
                                <SaveIcon className="w-5 h-5" />
                                Descargar
                            </button>
                        </div>
                    </div>

                     <button 
                        onClick={(e) => { e.stopPropagation(); handleNextPreview(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-[51] p-2 bg-zinc-800/70 hover:bg-zinc-700 rounded-full text-gray-200 transition-all hidden sm:block"
                        aria-label="Siguiente imagen"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </div>
            )}
            </>
        );
    }
    
    const dropzoneClasses = `w-full flex-grow flex flex-col justify-center p-4 border-2 border-dashed rounded-lg transition-colors
    ${ isDraggingOver
      ? 'bg-zinc-700 border-brand-primary'
      : 'cursor-pointer bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600'
    }`;

    return (
        <div className="flex flex-col h-full gap-4">
            {uploadedImages.length > 0 && (
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Archivos Subidos:</h4>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {uploadedImages.map((image, index) => (
                        <div key={index} className="relative group aspect-square w-28 flex-shrink-0">
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

            <div>
                <label htmlFor="image-url-input" className="block text-sm font-medium text-gray-400 mb-1">
                    Cargar desde URL (Falabella/Sodimac)
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 text-sm pointer-events-none">
                            .../
                        </span>
                        <input
                            id="image-url-input"
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
                            placeholder="Ingresa uno o más SKUs separados por coma"
                            disabled={isLoading}
                            className="w-full bg-zinc-700 border-zinc-600 rounded-md pl-10 pr-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all disabled:opacity-50"
                        />
                    </div>
                    <button
                        onClick={handleUrlUpload}
                        disabled={isLoading || !imageUrl.trim()}
                        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-sm text-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cargar
                    </button>
                </div>
                {urlError && <p className="text-red-500 text-xs mt-1">{urlError}</p>}
            </div>

            <div className="flex items-center gap-4">
                <hr className="flex-grow border-t border-zinc-700" />
                <span className="text-gray-500 text-sm">O</span>
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
                <div className="flex flex-col items-center justify-center text-center">
                    <UploadIcon className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click para subir</span>, arrastra y suelta <br/> o pega una imagen (Ctrl+V)</p>
                    <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
                </div>
                <input ref={fileInputRef} id="direct-upload-file" type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} disabled={isLoading} />
            </div>

        </div>
    );
};

export default GeneratedImage;