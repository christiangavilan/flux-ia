import React, { useState } from 'react';
import type { GenerationConfig } from '../types';
import { HelpIcon, MagicWandIcon, SpinnerIcon } from './icons';
import { enhancePrompt } from '../services/geminiService';

interface ControlPanelProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  isLoading: boolean;
  uploadedImagesCount: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig, isLoading, uploadedImagesCount }) => {
  const [isFinishingOptionsOpen, setIsFinishingOptionsOpen] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  
  const updateConfig = (field: keyof GenerationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };
  
  const handleEnhancePrompt = async () => {
    const currentText = config.backgroundKeywords.trim();
    if (!currentText || isEnhancingPrompt || isLoading) return;

    setIsEnhancingPrompt(true);
    try {
        // Explicitly requesting 'background' enhancement
        const enhancedText = await enhancePrompt(currentText, 'background');
        updateConfig('backgroundKeywords', enhancedText);
    } catch (error) {
        console.error("Failed to enhance prompt", error);
    } finally {
        setIsEnhancingPrompt(false);
    }
  };

  const SectionHeader = ({ title, tooltipText }: { title: string, tooltipText: string }) => (
    <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">{title}</h3>
        <div className="relative group">
            <HelpIcon className="w-4 h-4 text-gray-600 hover:text-gray-400 cursor-help transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-2 bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                {tooltipText}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-700"></div>
            </div>
        </div>
    </div>
  );

  const OptionButton = ({ id, name, value, label, checked, onChange, disabled }: { id: string, name: string, value: string, label: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, disabled: boolean }) => (
    <div className="relative">
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        className="sr-only peer"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <label
        htmlFor={id}
        className={`
          block w-full text-center px-3 py-2.5 text-sm rounded-lg border transition-all duration-300 ease-out-expo
          ${disabled ? 'border-zinc-800 bg-zinc-800/50 text-zinc-600 cursor-not-allowed' :
          'cursor-pointer hover:shadow-md'}
          ${checked 
            ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold ring-1 ring-brand-primary/50' 
            : 'border-zinc-700 bg-zinc-800 text-gray-400 hover:border-zinc-500 hover:bg-zinc-700 hover:text-gray-200'}
        `}
      >
        {label}
      </label>
    </div>
  );
  
  const isSeparateProductsDisabled = uploadedImagesCount <= 1;

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader title="1. Escenario" tooltipText="Elige el tipo de fondo. 'Blanco' y 'Gris' son para catálogos. 'Personalizado' te permite describir una escena. 'Automático' deja que la IA cree un fondo contextual." />
        <div className="grid grid-cols-2 gap-3">
            <OptionButton id="bg_white" name="backgroundType" value="pure_white" label="Blanco Puro" checked={config.backgroundType === 'pure_white'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
            <OptionButton id="bg_gray" name="backgroundType" value="neutral_gray" label="Gris Neutro" checked={config.backgroundType === 'neutral_gray'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
            <OptionButton id="bg_themed" name="backgroundType" value="themed" label="Personalizado" checked={config.backgroundType === 'themed'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
            <OptionButton id="bg_auto" name="backgroundType" value="automatic" label="Automático" checked={config.backgroundType === 'automatic'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
        </div>
        {config.backgroundType === 'themed' && (
          <div className="mt-3 animate-fade-in relative group">
            <textarea
                value={config.backgroundKeywords}
                onChange={(e) => updateConfig('backgroundKeywords', e.target.value)}
                placeholder="Describe el entorno (ej. 'sobre una mesa de madera rústica con luz de atardecer')"
                disabled={isLoading || isEnhancingPrompt}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-gray-200 placeholder-gray-600 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all duration-300 disabled:opacity-50 resize-none"
            />
             <button
                onClick={handleEnhancePrompt}
                disabled={!config.backgroundKeywords.trim() || isLoading || isEnhancingPrompt}
                className="absolute bottom-2 right-2 p-1.5 text-gray-500 hover:text-brand-primary bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-all shadow-sm disabled:opacity-0 disabled:pointer-events-none group-hover:opacity-100 opacity-100 sm:opacity-0"
                title="Mejorar prompt con IA"
            >
                {isEnhancingPrompt ? <SpinnerIcon className="w-4 h-4" /> : <MagicWandIcon className="w-4 h-4" />}
            </button>
          </div>
        )}
         {(config.backgroundType === 'themed' || config.backgroundType === 'automatic') && (
            <div className="mt-5 space-y-2 animate-fade-in p-3 bg-zinc-900/30 rounded-lg border border-zinc-800">
                <div className="flex justify-between items-center">
                    <label htmlFor="backgroundBlur" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        Desenfoque (Bokeh)
                    </label>
                    <span className="text-xs font-mono text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">{config.backgroundBlur}%</span>
                </div>
                <input
                    id="backgroundBlur"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={config.backgroundBlur}
                    onChange={(e) => updateConfig('backgroundBlur', parseInt(e.target.value, 10))}
                    disabled={isLoading}
                />
                 <div className="flex justify-between text-[10px] text-gray-500 px-1">
                    <span>Nítido</span>
                    <span>Muy Borroso</span>
                </div>
            </div>
        )}
        {(config.backgroundType === 'pure_white' || config.backgroundType === 'neutral_gray') && (
            <div className="mt-4">
                <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-800/30">
                    <button
                        onClick={() => setIsFinishingOptionsOpen(prev => !prev)}
                        className="w-full flex justify-between items-center p-3 text-left hover:bg-zinc-700/50 transition-colors focus:outline-none"
                        aria-expanded={isFinishingOptionsOpen}
                        aria-controls="finishing-options"
                    >
                        <span className="text-sm font-semibold text-gray-300">Opciones de Acabado</span>
                        <svg className={`w-4 h-4 text-gray-500 transform transition-transform duration-300 ease-out-expo ${isFinishingOptionsOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <div
                        id="finishing-options"
                        className={`transition-all duration-500 ease-out-expo overflow-hidden ${isFinishingOptionsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                        <div className="p-4 border-t border-zinc-700 space-y-4">
                             <div className="flex items-center justify-between">
                                <label htmlFor="addReflection" className="text-sm text-gray-300 flex items-center gap-2 cursor-pointer">
                                    Añadir Reflejo en Suelo
                                </label>
                                <label htmlFor="addReflection" className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="addReflection"
                                    className="sr-only peer"
                                    checked={config.addReflection}
                                    onChange={(e) => updateConfig('addReflection', e.target.checked)}
                                    disabled={isLoading}
                                />
                                <div className="w-9 h-5 bg-zinc-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                                </label>
                            </div>

                            <div className="border-t border-zinc-700/50"></div>

                            <div className={`transition-opacity duration-300 ${isSeparateProductsDisabled ? 'opacity-50' : ''}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <label htmlFor="separateProducts" className={`text-sm text-gray-300 flex items-center gap-2 ${isSeparateProductsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        Separar Productos (Grid)
                                    </label>
                                    <label htmlFor="separateProducts" className={`relative inline-flex items-center ${isSeparateProductsDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        id="separateProducts"
                                        className="sr-only peer"
                                        checked={config.separateProducts}
                                        onChange={(e) => updateConfig('separateProducts', e.target.checked)}
                                        disabled={isLoading || isSeparateProductsDisabled}
                                    />
                                    <div className="w-9 h-5 bg-zinc-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                                    </label>
                                </div>

                                {config.separateProducts && !isSeparateProductsDisabled && (
                                    <div className="space-y-2 pl-2 border-l-2 border-zinc-700 ml-1">
                                        <div className="flex justify-between items-center">
                                            <label htmlFor="productSeparation" className="text-xs font-medium text-gray-400">
                                                Distancia entre productos
                                            </label>
                                            <span className="text-xs font-mono text-gray-300">{config.productSeparation}%</span>
                                        </div>
                                        <input
                                            id="productSeparation"
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={config.productSeparation}
                                            onChange={(e) => updateConfig('productSeparation', parseInt(e.target.value, 10))}
                                            disabled={isLoading}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
      <div>
        <SectionHeader title="2. Iluminación" tooltipText="'Nítida' crea un look moderno con alto contraste. 'Suave' ofrece una sensación elegante y premium con luz difusa." />
        <div className="grid grid-cols-2 gap-3">
            <OptionButton id="light_sharp" name="lightingStyle" value="sharp" label="Nítida / Dura" checked={config.lightingStyle === 'sharp'} onChange={(e) => updateConfig('lightingStyle', e.target.value)} disabled={isLoading} />
            <OptionButton id="light_soft" name="lightingStyle" value="soft" label="Suave / Difusa" checked={config.lightingStyle === 'soft'} onChange={(e) => updateConfig('lightingStyle', e.target.value)} disabled={isLoading} />
        </div>
      </div>
      <div>
        <SectionHeader title="3. Relación de Aspecto" tooltipText="Define la proporción. '1:1' para redes sociales, '4:5' para posts verticales, '16:9' para banners." />
        <div className="grid grid-cols-3 gap-3">
            <OptionButton id="ar_1_1" name="aspectRatio" value="1:1" label="1:1" checked={config.aspectRatio === '1:1'} onChange={(e) => updateConfig('aspectRatio', e.target.value)} disabled={isLoading} />
            <OptionButton id="ar_4_5" name="aspectRatio" value="4:5" label="4:5" checked={config.aspectRatio === '4:5'} onChange={(e) => updateConfig('aspectRatio', e.target.value)} disabled={isLoading} />
            <OptionButton id="ar_16_9" name="aspectRatio" value="16:9" label="16:9" checked={config.aspectRatio === '16:9'} onChange={(e) => updateConfig('aspectRatio', e.target.value)} disabled={isLoading} />
        </div>
      </div>
       <div>
        <SectionHeader title="4. Estilo del Producto" tooltipText="'Original' respeta al 100% la foto subida. 'Mejorado' realza sutilmente los colores y texturas para mayor impacto." />
        <div className="grid grid-cols-2 gap-3">
            <OptionButton id="pv_original" name="productView" value="original" label="Fidelidad 100%" checked={config.productView === 'original'} onChange={(e) => updateConfig('productView', e.target.value)} disabled={isLoading} />
            <OptionButton id="pv_enhanced" name="productView" value="enhanced" label="IA Mejorada" checked={config.productView === 'enhanced'} onChange={(e) => updateConfig('productView', e.target.value)} disabled={isLoading} />
        </div>
         <p className="text-xs text-gray-500 pt-3 leading-relaxed">
            <span className="text-gray-300 font-semibold">Fidelidad:</span> Mantiene la apariencia exacta.<br />
            <span className="text-brand-primary font-semibold">IA Mejorada:</span> Realza colores y texturas sutilmente.
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;