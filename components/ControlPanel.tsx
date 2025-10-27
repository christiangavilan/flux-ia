import React, { useState } from 'react';
import type { GenerationConfig } from '../types';
import { HelpIcon } from './icons';

interface ControlPanelProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  isLoading: boolean;
  uploadedImagesCount: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig, isLoading, uploadedImagesCount }) => {
  const [isFinishingOptionsOpen, setIsFinishingOptionsOpen] = useState(false);
  
  const updateConfig = (field: keyof GenerationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };
  
  const SectionHeader = ({ title, tooltipText }: { title: string, tooltipText: string }) => (
    <div className="border-b border-zinc-700 pb-2 mb-3">
        <div className="flex items-center gap-2">
            <h3 className="text-md font-semibold text-gray-200">{title}</h3>
            <div className="relative group">
                <HelpIcon className="w-4 h-4 text-gray-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-2 bg-zinc-600 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {tooltipText}
                </div>
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
          block w-full text-center px-3 py-2 text-sm rounded-md border-2 transition-colors
          ${disabled ? 'border-zinc-700 bg-zinc-800 text-gray-500 cursor-not-allowed' :
          'cursor-pointer border-zinc-600 bg-zinc-700 hover:bg-zinc-600 hover:border-zinc-500 peer-checked:border-brand-primary peer-checked:bg-brand-primary/20 peer-checked:text-brand-primary font-semibold'}
        `}
      >
        {label}
      </label>
    </div>
  );
  
  const isSeparateProductsDisabled = uploadedImagesCount <= 1;

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader title="1. Fondo" tooltipText="Elige el tipo de fondo. 'Blanco' y 'Gris' son para catálogos. 'Personalizado' te permite describir una escena. 'Automático' deja que la IA cree un fondo contextual." />
        <div className="grid grid-cols-2 gap-2">
            <OptionButton id="bg_white" name="backgroundType" value="pure_white" label="Blanco Puro" checked={config.backgroundType === 'pure_white'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
            <OptionButton id="bg_gray" name="backgroundType" value="neutral_gray" label="Gris Neutro" checked={config.backgroundType === 'neutral_gray'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
            <OptionButton id="bg_themed" name="backgroundType" value="themed" label="Personalizado" checked={config.backgroundType === 'themed'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
            <OptionButton id="bg_auto" name="backgroundType" value="automatic" label="Automático" checked={config.backgroundType === 'automatic'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
        </div>
        {config.backgroundType === 'themed' && (
          <input
            type="text"
            value={config.backgroundKeywords}
            onChange={(e) => updateConfig('backgroundKeywords', e.target.value)}
            placeholder="ej. 'sobre una mesa de madera con plantas'"
            disabled={isLoading}
            className="w-full mt-3 bg-zinc-700 border-zinc-600 rounded-md px-3 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all disabled:opacity-50"
          />
        )}
        {(config.backgroundType === 'pure_white' || config.backgroundType === 'neutral_gray') && (
            <div className="mt-4">
                <div className="border border-zinc-700 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setIsFinishingOptionsOpen(prev => !prev)}
                        className="w-full flex justify-between items-center p-3 text-left bg-zinc-700/30 hover:bg-zinc-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary"
                        aria-expanded={isFinishingOptionsOpen}
                        aria-controls="finishing-options"
                    >
                        <span className="text-sm font-semibold text-gray-300">Opciones de Acabado</span>
                        <svg className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 ${isFinishingOptionsOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <div
                        id="finishing-options"
                        className={`transition-all duration-300 ease-in-out ${isFinishingOptionsOpen ? 'max-h-96' : 'max-h-0'}`}
                    >
                        <div className="p-3 border-t border-zinc-600 space-y-3">
                             <div className="flex items-center justify-between">
                                <label htmlFor="addReflection" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                                    Añadir Reflejos
                                    <div className="relative group">
                                        <HelpIcon className="w-4 h-4 text-gray-500 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-2 bg-zinc-600 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                            Crea un reflejo sutil y realista del producto sobre la superficie.
                                        </div>
                                    </div>
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
                                <div className="w-11 h-6 bg-zinc-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                                </label>
                            </div>

                            <div className="border-t border-zinc-700/50"></div>

                            <div className={`transition-opacity ${isSeparateProductsDisabled ? 'opacity-50' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="separateProducts" className={`text-sm font-medium text-gray-200 flex items-center gap-2 ${isSeparateProductsDisabled ? 'cursor-not-allowed' : ''}`}>
                                        Separar Productos
                                        <div className="relative group">
                                            <HelpIcon className="w-4 h-4 text-gray-500 cursor-help" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-2 bg-zinc-600 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                {isSeparateProductsDisabled
                                                ? "Sube más de una imagen para activar esta opción."
                                                : "Si subes múltiples imágenes, estas aparecerán separadas en el lienzo, sin tocarse. Ideal para catálogos."}
                                            </div>
                                        </div>
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
                                    <div className="w-11 h-6 bg-zinc-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                                    </label>
                                </div>

                                {config.separateProducts && !isSeparateProductsDisabled && (
                                    <div className="pt-3 space-y-1">
                                        <div className="flex justify-between items-center px-1">
                                            <label htmlFor="productSeparation" className="text-xs font-medium text-gray-400">
                                                Nivel de Separación
                                            </label>
                                            <span className="text-xs font-mono bg-zinc-800 text-gray-300 px-1.5 py-0.5 rounded-md">{config.productSeparation}</span>
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
                                            className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-brand-primary"
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
        <div className="grid grid-cols-2 gap-2">
            <OptionButton id="light_sharp" name="lightingStyle" value="sharp" label="Nítida y Enérgica" checked={config.lightingStyle === 'sharp'} onChange={(e) => updateConfig('lightingStyle', e.target.value)} disabled={isLoading} />
            <OptionButton id="light_soft" name="lightingStyle" value="soft" label="Suave y Uniforme" checked={config.lightingStyle === 'soft'} onChange={(e) => updateConfig('lightingStyle', e.target.value)} disabled={isLoading} />
        </div>
      </div>
      <div>
        <SectionHeader title="3. Formato" tooltipText="Define la proporción. '1:1' para redes sociales, '4:5' para posts verticales, '16:9' para banners." />
        <div className="grid grid-cols-3 gap-2">
            <OptionButton id="ar_1_1" name="aspectRatio" value="1:1" label="1:1" checked={config.aspectRatio === '1:1'} onChange={(e) => updateConfig('aspectRatio', e.target.value)} disabled={isLoading} />
            <OptionButton id="ar_4_5" name="aspectRatio" value="4:5" label="4:5" checked={config.aspectRatio === '4:5'} onChange={(e) => updateConfig('aspectRatio', e.target.value)} disabled={isLoading} />
            <OptionButton id="ar_16_9" name="aspectRatio" value="16:9" label="16:9" checked={config.aspectRatio === '16:9'} onChange={(e) => updateConfig('aspectRatio', e.target.value)} disabled={isLoading} />
        </div>
      </div>
       <div>
        <SectionHeader title="4. Apariencia del Producto" tooltipText="'Original' respeta al 100% la foto subida. 'Mejorado' realza sutilmente los colores y texturas para mayor impacto." />
        <div className="grid grid-cols-2 gap-2">
            <OptionButton id="pv_original" name="productView" value="original" label="Original" checked={config.productView === 'original'} onChange={(e) => updateConfig('productView', e.target.value)} disabled={isLoading} />
            <OptionButton id="pv_enhanced" name="productView" value="enhanced" label="Mejorado" checked={config.productView === 'enhanced'} onChange={(e) => updateConfig('productView', e.target.value)} disabled={isLoading} />
        </div>
         <p className="text-xs text-gray-500 pt-2">
            <b>Original:</b> Mantiene la apariencia exacta del producto. <br />
            <b>Mejorado:</b> Realza sutilmente colores y texturas para mayor atractivo.
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;