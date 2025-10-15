import React, { useState, useCallback } from 'react';
import type { GenerationConfig, UploadedFile } from './types';
import ControlPanel from './components/ControlPanel';
import ImageUploader from './components/ImageUploader';
import GeneratedImage from './components/GeneratedImage';
import { SparklesIcon } from './components/icons';
import { generateProductImage, refineProductImage } from './services/geminiService';

const App: React.FC = () => {
  const [config, setConfig] = useState<GenerationConfig>({
    backgroundType: 'pure_white',
    backgroundKeywords: '',
    lightingStyle: 'sharp',
    aspectRatio: '1:1',
    outputSize: '2k',
    productView: 'original',
  });
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null); // For selection view
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refinementCommand, setRefinementCommand] = useState<string>('');

  const activeImage = activeImageIndex !== null ? imageHistory[activeImageIndex] : null;

  const handleGenerate = useCallback(async () => {
    if (uploadedImages.length === 0 || isLoading) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImages(null);
    setImageHistory([]);
    setActiveImageIndex(null);

    try {
      const results = await generateProductImage(uploadedImages, config);
      if (results.length === 1) {
        setImageHistory(results);
        setActiveImageIndex(0);
      } else {
        setGeneratedImages(results);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImages, config, isLoading]);

  const executeRefinement = useCallback(async (command: string) => {
    if (activeImageIndex === null || isLoading || !command) return;

    const imageToRefine = imageHistory[activeImageIndex];
    setIsLoading(true);
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
      
      if (generatedImages) {
        setGeneratedImages(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [activeImageIndex, imageHistory, isLoading, config, generatedImages]);

  const handleRefine = useCallback(async () => {
    await executeRefinement(refinementCommand);
    setRefinementCommand('');
  }, [refinementCommand, executeRefinement]);

  const handleQuickRefine = useCallback(async (command: string) => {
    await executeRefinement(command);
  }, [executeRefinement]);

  const handleSelectImage = (image: string) => {
    setImageHistory([image]);
    setActiveImageIndex(0);
  };

  const handleCancelSelection = () => {
    setGeneratedImages(null);
  };

  const handleGoBackToSelection = () => {
    setActiveImageIndex(null);
    setImageHistory([]);
  };

  const handleHistoryClick = (index: number) => {
    setActiveImageIndex(index);
  };
  
  const quickRefinements = [
    { label: '+ Brillo', command: 'increase brightness slightly' },
    { label: '+ Contraste', command: 'increase contrast subtly' },
    { label: 'Añadir Sombra', command: 'add a soft, realistic shadow under the product' },
    { label: 'Más Nitidez', command: 'increase sharpness slightly' },
  ];

  return (
    <div className="min-h-screen bg-zinc-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-white">
              Editor IA para <span className="font-bold text-brand-primary">falabella.</span>
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
              Transforma tus imágenes de producto en fotografías profesionales con IA.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-zinc-800/50 p-6 rounded-xl shadow-lg flex flex-col gap-8">
            <ImageUploader uploadedImages={uploadedImages} setUploadedImages={setUploadedImages} isLoading={isLoading} />
            <ControlPanel
              config={config}
              setConfig={setConfig}
              isLoading={isLoading}
            />
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-zinc-800/50 p-6 rounded-xl shadow-lg flex-grow flex flex-col justify-center">
              <GeneratedImage
                generatedImages={generatedImages}
                activeImage={activeImage}
                imageHistory={imageHistory}
                activeImageIndex={activeImageIndex}
                onSelectImage={handleSelectImage}
                onHistoryClick={handleHistoryClick}
                isLoading={isLoading}
                error={error}
                aspectRatio={config.aspectRatio}
                onCancelSelection={handleCancelSelection}
                onGoBackToSelection={handleGoBackToSelection}
              />
            </div>
            <div className="bg-zinc-800/50 p-6 rounded-xl shadow-lg space-y-4">
              <div className="relative group w-full">
                 <button
                    onClick={handleGenerate}
                    disabled={isLoading || uploadedImages.length === 0}
                    className="w-full bg-brand-primary hover:bg-brand-primary-hover disabled:bg-zinc-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                    <SparklesIcon className="w-5 h-5" />
                    Generar Imagen
                </button>
                 {uploadedImages.length === 0 && !isLoading && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1 bg-zinc-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Sube al menos una imagen para empezar
                    </div>
                )}
              </div>
              <div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                      type="text"
                      value={refinementCommand}
                      onChange={(e) => setRefinementCommand(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                      placeholder='ej. "hazlo más oscuro", "mueve a la derecha"'
                      disabled={isLoading || !activeImage}
                      className="flex-grow bg-zinc-700 border-zinc-600 rounded-md px-3 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all disabled:opacity-50"
                  />
                  <div className="relative group sm:w-auto">
                    <button
                        onClick={handleRefine}
                        disabled={isLoading || !activeImage || !refinementCommand.trim()}
                        className="w-full sm:w-auto bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-all"
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
                  <div className="flex flex-wrap gap-2 pt-3">
                      <p className="text-xs text-gray-400 w-full mb-1">Ajustes rápidos:</p>
                      {quickRefinements.map(({ label, command }) => (
                          <button
                              key={label}
                              onClick={() => handleQuickRefine(command)}
                              disabled={isLoading || !activeImage}
                              className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-sm text-gray-300 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {label}
                          </button>
                      ))}
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
    </div>
  );
};

export default App;