import React from 'react';
import type { GenerationConfig } from '../types';
import { HelpIcon } from './icons';

interface ControlPanelProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  isLoading: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig, isLoading }) => {
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

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader title="Fondo" tooltipText="Elige el tipo de fondo. 'Blanco' y 'Gris' son para catálogos. 'Temático' te permite describir una escena. 'Automático' deja que la IA cree un fondo contextual." />
        <div className="grid grid-cols-2 gap-2">
            <OptionButton id="bg_white" name="backgroundType" value="pure_white" label="Blanco Puro" checked={config.backgroundType === 'pure_white'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
            <OptionButton id="bg_gray" name="backgroundType" value="neutral_gray" label="Gris Neutro" checked={config.backgroundType === 'neutral_gray'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
            <OptionButton id="bg_themed" name="backgroundType" value="themed" label="Temático" checked={config.backgroundType === 'themed'} onChange={(e) => updateConfig('backgroundType', e.target.value)} disabled={isLoading} />
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
      </div>
      <div>
        <SectionHeader title="Iluminación" tooltipText="'Nítida' crea un look moderno con alto contraste. 'Suave' ofrece una sensación elegante y premium con luz difusa." />
        <div className="grid grid-cols-2 gap-2">
            <OptionButton id="light_sharp" name="lightingStyle" value="sharp" label="Nítida y Energética" checked={config.lightingStyle === 'sharp'} onChange={(e) => updateConfig('lightingStyle', e.target.value)} disabled={isLoading} />
            <OptionButton id="light_soft" name="lightingStyle" value="soft" label="Suave y Uniforme" checked={config.lightingStyle === 'soft'} onChange={(e) => updateConfig('lightingStyle', e.target.value)} disabled={isLoading} />
        </div>
      </div>
      <div>
        <SectionHeader title="Formato" tooltipText="Define la proporción. '1:1' es para redes sociales, '4:5' para posts verticales, y '16:9' para banners." />
        <div className="grid grid-cols-3 gap-2">
            <OptionButton id="ar_1_1" name="aspectRatio" value="1:1" label="1:1" checked={config.aspectRatio === '1:1'} onChange={(e) => updateConfig('aspectRatio', e.target.value)} disabled={isLoading} />
            <OptionButton id="ar_4_5" name="aspectRatio" value="4:5" label="4:5" checked={config.aspectRatio === '4:5'} onChange={(e) => updateConfig('aspectRatio', e.target.value)} disabled={isLoading} />
            <OptionButton id="ar_16_9" name="aspectRatio" value="16:9" label="16:9" checked={config.aspectRatio === '16:9'} onChange={(e) => updateConfig('aspectRatio', e.target.value)} disabled={isLoading} />
        </div>
      </div>
       <div>
        <SectionHeader title="Apariencia del Producto" tooltipText="'Original' respeta al 100% la foto subida. 'Mejorado' realza sutilmente los colores y texturas para mayor impacto." />
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