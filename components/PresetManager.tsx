import React from 'react';
import { SaveIcon, TrashIcon } from './icons';
import type { Preset } from '../types';

interface PresetManagerProps {
  presets: Preset[];
  onSave: () => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  isLoading: boolean;
}

const PresetManager: React.FC<PresetManagerProps> = ({ presets, onSave, onLoad, onDelete, isLoading }) => {
  const handleLoadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      onLoad(value);
      e.target.value = '';
    }
  };

  return (
    <div>
      <h3 className="text-md font-semibold text-gray-200 border-b border-zinc-700 pb-2 mb-4">5. Preajustes (Presets)</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          onChange={handleLoadChange}
          disabled={isLoading || presets.length === 0}
          className="flex-grow bg-zinc-700 border-zinc-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          value=""
        >
          <option value="">Cargar un preajuste...</option>
          {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        <button
          onClick={onSave}
          disabled={isLoading}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-sm text-gray-300 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          aria-label="Guardar preajuste actual"
        >
          <SaveIcon className="w-4 h-4" />
          <span>Guardar Actual</span>
        </button>
      </div>
      {presets.length > 0 && (
        <div className="mt-3 space-y-2 max-h-32 overflow-y-auto pr-2">
          {presets.map(p => (
            <div key={p.name} className="flex justify-between items-center bg-zinc-700/50 p-2 rounded-md text-sm group">
              <span className="text-gray-300 truncate pr-2">{p.name}</span>
              <button
                onClick={() => onDelete(p.name)}
                disabled={isLoading}
                className="p-1 text-gray-500 hover:text-red-500 rounded-full disabled:opacity-50 transition-colors opacity-50 group-hover:opacity-100"
                aria-label={`Eliminar preajuste ${p.name}`}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PresetManager;