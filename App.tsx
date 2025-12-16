
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { GenerationConfig, UploadedFile } from './types';
import ControlPanel from './components/ControlPanel';
import GeneratedImage from './components/GeneratedImage';
import { SparklesIcon, CloseIcon, SpinnerIcon, SunIcon, ContrastIcon, ShadowIcon, SharpnessIcon, MagicWandIcon } from './components/icons';
import { generateProductImage, refineProductImage, enhancePrompt } from './services/geminiService';

const MAX_CONCURRENT_REQUESTS = 3; // Límite de solicitudes simultáneas a la API

// Componente auxiliar para manejar el Hover largo (2 segundos)
interface QuickRefineBtnProps {
  label: string;
  command: string;
  icon: React.ElementType;
  description: string;
  onClick: (cmd: string) => void;
  disabled: boolean;
  isProcessing: boolean;
}

const QuickRefineBtn: React.FC<QuickRefineBtnProps> = ({ label, command, icon: Icon, description, onClick, disabled, isProcessing }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (disabled) return;
    // Esperar 2 segundos (2000ms) antes de mostrar el tooltip
    timerRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowTooltip(false);
  };

  const handleClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowTooltip(false);
    onClick(command);
  };

  return (
    <div className="relative group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
          onClick={handleClick}
          disabled={disabled}
          className="w-full group flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
          {isProcessing ? (
              <SpinnerIcon className="w-4 h-4 text-brand-primary" />
          ) : (
              <Icon className="w-4 h-4 text-zinc-400 group-hover:text-brand-primary transition-colors" />
          )}
          <span className="text-xs font-medium text-gray-300 group-hover:text-white">{label}</span>
      </button>
      
      {/* Tooltip con animación */}
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[180px] px-3 py-2 bg-zinc-900 border border-zinc-600 text-gray-200 text-xs rounded-md shadow-xl z-20 pointer-events-none transition-all duration-300 ${showTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
          {description}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-600"></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [config, setConfig] = useState<GenerationConfig>({
    backgroundType: 'pure_white',
    backgroundKeywords: '',
    lightingStyle: 'sharp',
    aspectRatio: '1:1',
    productView: 'original',
    addReflection: false,
    separateProducts: false,
    productSeparation: 50,
    backgroundBlur: 0,
  });
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null); // For selection view
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refinementCommand, setRefinementCommand] = useState<string>('');
  const [isEnhancingRefinePrompt, setIsEnhancingRefinePrompt] = useState(false);
  const [activeRequests, setActiveRequests] = useState(0);
  const [processingQuickRefine, setProcessingQuickRefine] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);


  // --- Effects ---
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleShowToast = useCallback((message: string) => {
      setToast({ message, id: Date.now() });
  }, []);

  const activeImage = activeImageIndex !== null ? imageHistory[activeImageIndex] : null;
  const isAtConcurrencyLimit = activeRequests >= MAX_CONCURRENT_REQUESTS;

  // --- API Calls ---
  const handleGenerate = useCallback(async () => {
    if (uploadedImages.length === 0 || isLoading || isAtConcurrencyLimit) return;

    setIsLoading(true);
    setActiveRequests(prev => prev + 1);
    setError(null);
    setGeneratedImages(null);
    setImageHistory([]);
    setActiveImageIndex(null);
    setRefinementCommand(''); // Reset refinement command on new generation

    try {
      const results = await generateProductImage(uploadedImages, config);
      if (results.length === 1) {
        setImageHistory(results);
        setActiveImageIndex(0);
        setGeneratedImages(null); // Explicitly clear generated images if only one result
      } else {
        setGeneratedImages(results);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      setActiveRequests(prev => prev - 1);
    }
  }, [uploadedImages, config, isLoading, isAtConcurrencyLimit]);

  const executeRefinement = useCallback(async (command: string): Promise<boolean> => {
    if (activeImageIndex === null || isLoading || !command || isAtConcurrencyLimit) return false;

    const imageToRefine = imageHistory[activeImageIndex];
    setIsLoading(true);
    setActiveRequests(prev => prev + 1);
    setError(null);

    try {
      const baseImageFile: UploadedFile = {
        base64: imageToRefine,
        name: 'generated_image.png',
        type: 'image/png'
      };
      const resultBase64 = await refineProductImage(baseImageFile, command, config);
      
      const newHistory = imageHistory.slice(0, activeImageIndex + 1);
      newHistory.push(resultBase64);
      setImageHistory(newHistory);
      setActiveImageIndex(newHistory.length - 1);
      
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      return false;
    } finally {
      setIsLoading(false);
      setActiveRequests(prev => prev - 1);
    }
  }, [activeImageIndex, imageHistory, isLoading, config, isAtConcurrencyLimit]);

  const handleRefine = useCallback(async () => {
    const success = await executeRefinement(refinementCommand);
    if (success) {
      setRefinementCommand('');
    }
  }, [refinementCommand, executeRefinement]);

  const handleEnhanceRefinePrompt = async () => {
    const currentText = refinementCommand.trim();
    if (!currentText || isEnhancingRefinePrompt || isLoading) return;

    setIsEnhancingRefinePrompt(true);
    try {
        const enhancedText = await enhancePrompt(currentText, 'refinement');
        setRefinementCommand(enhancedText);
    } catch (error) {
        console.error("Failed to enhance refine prompt", error);
    } finally {
        setIsEnhancingRefinePrompt(false);
    }
  };

  const handleQuickRefine = useCallback(async (command: string) => {
    setProcessingQuickRefine(command);
    await executeRefinement(command);
    setProcessingQuickRefine(null);
  }, [executeRefinement]);


  // --- Image Selection Logic ---
  const handleSelectImage = (image: string) => {
    setImageHistory([image]);
    setActiveImageIndex(0);
    // Do NOT clear generatedImages, as it's needed for the 'go back' button
  };
  
  const handleCancelSelection = () => { 
      setGeneratedImages(null); 
  };
  
  const handleGoBackToSelection = () => {
    if (generatedImages && generatedImages.length > 0) {
      setActiveImageIndex(null);
      setImageHistory([]);
    }
  };
  
  const handleHistoryClick = (index: number) => { setActiveImageIndex(index); };
  
  const handleImagesUploaded = useCallback((files: UploadedFile[] | ((prevState: UploadedFile[]) => UploadedFile[])) => {
    setUploadedImages(files);
    // Reset generation state when new images are uploaded
    setGeneratedImages(null);
    setImageHistory([]);
    setActiveImageIndex(null);
    setError(null);
}, []);

  // --- UI Variables ---
  const quickRefinements = [
    { 
        label: 'Iluminar', 
        command: 'increase brightness slightly', 
        icon: SunIcon,
        description: 'Sube la exposición global para una imagen más clara.'
    },
    { 
        label: 'Contraste', 
        command: 'increase contrast subtly', 
        icon: ContrastIcon,
        description: 'Aumenta la diferencia entre luces y sombras.' 
    },
    { 
        label: 'Sombra', 
        command: 'add a soft, realistic shadow under the product', 
        icon: ShadowIcon,
        description: 'Añade una sombra de contacto realista bajo el producto.' 
    },
    { 
        label: 'Nitidez', 
        command: 'increase sharpness slightly', 
        icon: SharpnessIcon,
        description: 'Mejora el enfoque y los detalles de los bordes.' 
    },
  ];
  
  const generateButtonDisabled = isLoading || uploadedImages.length === 0 || isAtConcurrencyLimit;
  const refineButtonDisabled = isLoading || !activeImage || isAtConcurrencyLimit || !!processingQuickRefine;
  const refineTextInputDisabled = isLoading || !activeImage || !refinementCommand.trim() || isAtConcurrencyLimit || !!processingQuickRefine;

  return (
    <div className="min-h-screen bg-zinc-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10 animate-fade-in-down">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-white">
              Flux <span className="text-brand-primary">IA</span>
            </h1>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                Transforma tus imágenes de producto Falabella en fotografías profesionales IA.
            </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Configuration & Generation */}
          <div className="bg-zinc-800/50 p-6 rounded-xl shadow-lg flex flex-col gap-8 h-fit animate-slide-up animate-delay-100">
            <ControlPanel
              config={config}
              setConfig={setConfig}
              isLoading={isLoading || isAtConcurrencyLimit}
              uploadedImagesCount={uploadedImages.length}
            />
            
            {/* Generate Button Moved Here */}
            <div className="relative group w-full pt-4 border-t border-zinc-700">
                 <button
                    onClick={handleGenerate}
                    disabled={generateButtonDisabled}
                    className="w-full bg-brand-primary hover:bg-brand-primary-hover disabled:bg-zinc-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-brand-primary/20 hover:-translate-y-0.5"
                >
                    <SparklesIcon className="w-5 h-5" />
                    {isAtConcurrencyLimit ? 'Procesando otras solicitudes...' : 'Generar Imagen'}
                </button>
                 {!isLoading && generateButtonDisabled && (
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1 bg-zinc-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {uploadedImages.length === 0 ? "Sube al menos una imagen para empezar" : isAtConcurrencyLimit ? `Límite de ${MAX_CONCURRENT_REQUESTS} solicitudes. Intenta en un momento.` : ''}
                   </div>
                 )}
            </div>
          </div>

          {/* Right Panel: Results & Refinement */}
          <div className="flex flex-col gap-6 animate-slide-up animate-delay-200">
            <div className="bg-zinc-800/50 p-6 rounded-xl shadow-lg flex-grow flex flex-col justify-center">
              <GeneratedImage
                generatedImages={generatedImages}
                activeImage={activeImage}
                imageHistory={imageHistory}
                activeImageIndex={activeImageIndex}
                uploadedImages={uploadedImages}
                setUploadedImages={handleImagesUploaded}
                onSelectImage={handleSelectImage}
                onHistoryClick={handleHistoryClick}
                isLoading={isLoading}
                error={error}
                aspectRatio={config.aspectRatio}
                onCancelSelection={handleCancelSelection}
                onGoBackToSelection={handleGoBackToSelection}
                onShowToast={handleShowToast}
              />
            </div>
            
            {/* Refinement Section */}
            <div className="bg-zinc-800/50 p-6 rounded-xl shadow-lg space-y-4">
              <div>
                <div className="flex flex-col gap-3">
                  <div className="relative flex-grow group">
                      <textarea
                          value={refinementCommand}
                          onChange={(e) => setRefinementCommand(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleRefine();
                            }
                          }}
                          placeholder='ej. "hazlo más oscuro", "mueve a la derecha"'
                          disabled={refineButtonDisabled || isEnhancingRefinePrompt}
                          rows={2} // Changed from 3 to 2
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-gray-200 placeholder-gray-600 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all disabled:opacity-50 resize-none"
                      />
                      <button
                        onClick={handleEnhanceRefinePrompt}
                        disabled={!refinementCommand.trim() || isLoading || isEnhancingRefinePrompt || refineButtonDisabled}
                        className="absolute bottom-2 right-2 p-1.5 text-gray-400 hover:text-brand-primary bg-zinc-800/80 hover:bg-zinc-900 border border-zinc-600 hover:border-brand-primary/50 rounded transition-all shadow-sm disabled:opacity-0 backdrop-blur-sm"
                        title="Mejorar instrucción con IA"
                    >
                        {isEnhancingRefinePrompt ? <SpinnerIcon className="w-4 h-4" /> : <MagicWandIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative group w-full">
                    <button
                        onClick={handleRefine}
                        disabled={refineTextInputDisabled}
                        className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-all"
                    >
                        Refinar
                    </button>
                    {!activeImage && !isLoading && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1 bg-zinc-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Genera una imagen para poder refinarla
                      </div>
                    )}
                  </div>
                </div>
                {activeImage && (
                   <div className="pt-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ajustes rápidos</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {quickRefinements.map(({ label, command, icon, description }) => (
                              <QuickRefineBtn
                                key={label}
                                label={label}
                                command={command}
                                icon={icon}
                                description={description}
                                onClick={handleQuickRefine}
                                disabled={refineButtonDisabled}
                                isProcessing={processingQuickRefine === command}
                              />
                          ))}
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <footer className="text-center py-8 mt-10 border-t border-zinc-800">
            <p className="text-sm text-gray-500">
                Desarrollo <a href="mailto:ext_cgavilanl@falabella.cl" className="underline hover:text-brand-primary transition-colors">Christian Gavilán</a> & Google AI Studio
            </p>
        </footer>
      </div>

      {/* Toast Notification */}
      {toast && (
          <div key={toast.id} className="fixed top-5 right-5 z-50 animate-fade-in-down">
              <div className="flex items-center gap-3 bg-zinc-700 text-white text-sm font-semibold px-4 py-3 rounded-lg shadow-lg border border-zinc-600">
                  <span>{toast.message}</span>
                  <button onClick={() => setToast(null)} className="p-1 rounded-full hover:bg-zinc-600/50">
                    <CloseIcon className="w-4 h-4" />
                  </button>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;
