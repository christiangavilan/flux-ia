import React, { useState, useCallback, useEffect } from 'react';
import type { GenerationConfig, UploadedFile, Preset } from './types';
import ControlPanel from './components/ControlPanel';
import GeneratedImage from './components/GeneratedImage';
import PresetManager from './components/PresetManager';
import { SparklesIcon, CloseIcon, SpinnerIcon } from './components/icons';
import { generateProductImage, refineProductImage } from './services/geminiService';

const MAX_CONCURRENT_REQUESTS = 3; // Límite de solicitudes simultáneas a la API
const PRESETS_STORAGE_KEY = 'flux-ia-presets';

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
  });
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null); // For selection view
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refinementCommand, setRefinementCommand] = useState<string>('');
  const [activeRequests, setActiveRequests] = useState(0);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [processingQuickRefine, setProcessingQuickRefine] = useState<string | null>(null);

  // State for new preset management UI
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);


  // --- Effects ---
  useEffect(() => {
    try {
      const storedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (storedPresets) {
        setPresets(JSON.parse(storedPresets));
      }
    } catch (e) {
      console.error("Failed to load presets from localStorage", e);
    }
  }, []);
  
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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

  // --- Preset Management ---
  const showToast = useCallback((message: string) => { setToast({ message, id: Date.now() }); }, []);
  
  const updatePresets = useCallback((newPresets: Preset[]) => {
    setPresets(newPresets);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
  }, []);
  
  const handleSavePreset = () => { setIsSavePresetModalOpen(true); };
  
  const confirmAndSavePreset = useCallback(() => {
    const name = presetNameInput.trim();
    if (!name) return;

    const newPreset: Preset = { name, config };
    const existingIndex = presets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    let updatedPresets;

    if (existingIndex > -1) {
        if (!window.confirm(`Ya existe un preajuste con el nombre "${name}". ¿Quieres sobrescribirlo?`)) {
            return;
        }
        updatedPresets = [...presets];
        updatedPresets[existingIndex] = newPreset;
    } else {
        updatedPresets = [...presets, newPreset];
    }
    
    updatePresets(updatedPresets.sort((a, b) => a.name.localeCompare(b.name)));
    showToast(`Preajuste "${name}" guardado.`);
    setIsSavePresetModalOpen(false);
    setPresetNameInput('');
  }, [presetNameInput, presets, config, updatePresets, showToast]);

  const handleLoadPreset = useCallback((name: string) => {
    const preset = presets.find(p => p.name === name);
    if (preset) {
      setConfig(preset.config);
      showToast(`Preajuste "${name}" cargado.`);
    }
  }, [presets, showToast]);

  const handleDeletePreset = useCallback((name: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el preajuste "${name}"?`)) {
      const updatedPresets = presets.filter(p => p.name !== name);
      updatePresets(updatedPresets);
      showToast(`Preajuste "${name}" eliminado.`);
    }
  }, [presets, updatePresets, showToast]);
  
  // --- UI Variables ---
  const quickRefinements = [
    { label: '+ Brillo', command: 'increase brightness slightly' },
    { label: '+ Contraste', command: 'increase contrast subtly' },
    { label: 'Añadir Sombra', command: 'add a soft, realistic shadow under the product' },
    { label: 'Más Nitidez', command: 'increase sharpness slightly' },
  ];
  
  const generateButtonDisabled = isLoading || uploadedImages.length === 0 || isAtConcurrencyLimit;
  const refineButtonDisabled = isLoading || !activeImage || isAtConcurrencyLimit || !!processingQuickRefine;
  const refineTextInputDisabled = isLoading || !activeImage || !refinementCommand.trim() || isAtConcurrencyLimit || !!processingQuickRefine;

  return (
    <div className="min-h-screen bg-zinc-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-white">
              Flux <span className="text-brand-primary">IA</span>
            </h1>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                Transforma tus imágenes de producto Falabella en fotografías profesionales IA.
            </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-zinc-800/50 p-6 rounded-xl shadow-lg flex flex-col gap-8">
            <ControlPanel
              config={config}
              setConfig={setConfig}
              isLoading={isLoading || isAtConcurrencyLimit}
              uploadedImagesCount={uploadedImages.length}
            />
            <hr className="border-zinc-700" />
            <PresetManager
              presets={presets}
              onSave={handleSavePreset}
              onLoad={handleLoadPreset}
              onDelete={handleDeletePreset}
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
                uploadedImages={uploadedImages}
                setUploadedImages={handleImagesUploaded}
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
                    disabled={generateButtonDisabled}
                    className="w-full bg-brand-primary hover:bg-brand-primary-hover disabled:bg-zinc-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
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
              <div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                      type="text"
                      value={refinementCommand}
                      onChange={(e) => setRefinementCommand(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                      placeholder='ej. "hazlo más oscuro", "mueve a la derecha"'
                      disabled={refineButtonDisabled}
                      className="flex-grow bg-zinc-700 border-zinc-600 rounded-md px-3 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all disabled:opacity-50"
                  />
                  <div className="relative group sm:w-auto">
                    <button
                        onClick={handleRefine}
                        disabled={refineTextInputDisabled}
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
                              disabled={refineButtonDisabled}
                              className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-sm text-gray-300 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-24"
                          >
                              {processingQuickRefine === command ? <SpinnerIcon className="w-4 h-4 text-zinc-400" /> : label}
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

      {/* Save Preset Modal */}
      {isSavePresetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsSavePresetModalOpen(false)}>
          <div className="bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Guardar Preajuste</h3>
            <p className="text-sm text-gray-400 mb-4">Ingresa un nombre para guardar la configuración actual.</p>
            <input
              type="text"
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmAndSavePreset()}
              placeholder="Ej. 'Zapatillas fondo blanco'"
              autoFocus
              className="w-full bg-zinc-700 border-zinc-600 rounded-md px-3 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setIsSavePresetModalOpen(false); setPresetNameInput(''); }}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-sm text-gray-300 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAndSavePreset}
                disabled={!presetNameInput.trim()}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-sm text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

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