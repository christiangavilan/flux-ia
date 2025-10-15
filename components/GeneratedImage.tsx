import React from 'react';
import { SparklesIcon, SpinnerIcon, CloseIcon } from './icons';

interface GeneratedImageProps {
  generatedImages: string[] | null;
  activeImage: string | null;
  imageHistory: string[];
  activeImageIndex: number | null;
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
    onSelectImage, 
    onHistoryClick,
    isLoading, 
    error, 
    aspectRatio, 
    onCancelSelection, 
    onGoBackToSelection 
}) => {
    const [messageIndex, setMessageIndex] = React.useState(0);

    React.useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setMessageIndex(prev => (prev + 1) % loadingMessages.length);
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [isLoading]);

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
        return (
            <div className="w-full h-full flex flex-col justify-center gap-4">
                <div className={`relative group w-full ${getAspectRatioClass(aspectRatio)} mx-auto`}>
                    <img src={`data:image/png;base64,${activeImage}`} alt="Generated product" className="w-full h-full object-contain rounded-lg" />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center">
                        <button
                            onClick={() => downloadImage(activeImage)}
                            className="opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                        >
                            Descargar
                        </button>
                    </div>
                    {generatedImages && generatedImages.length > 1 && (
                         <button
                            onClick={onGoBackToSelection}
                            className="absolute top-3 left-3 z-10 p-2 bg-zinc-800/70 hover:bg-zinc-700 rounded-full text-gray-200 transition-colors"
                            aria-label="Volver a la selección"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                            </svg>
                        </button>
                    )}
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
    
    if (generatedImages && generatedImages.length > 1) {
        return (
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
                            onClick={() => onSelectImage(image)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Seleccionar opción ${index + 1}`}
                            onKeyDown={(e) => e.key === 'Enter' && onSelectImage(image)}
                        >
                            <img src={`data:image/png;base64,${image}`} alt={`Opción ${index + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex flex-col items-center justify-center text-white p-2 text-center">
                                <span className="font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity">Opción {index + 1}</span>
                                <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity mt-1">Click para seleccionar</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={containerClasses}>
            <div className="text-center p-4">
                <SparklesIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-lg font-medium text-gray-500">Tu Imagen Profesional</p>
                <p className="text-sm text-gray-600">Aparecerá aquí</p>
            </div>
        </div>
    );
};

export default GeneratedImage;