import React, { useState, useEffect, useRef } from 'react';
import { Columns3, Check, RotateCcw } from 'lucide-react';

export interface ColumnOption {
  id: string;
  label: string;
  defaultVisible: boolean;
}

interface ColumnCustomizerPopoverProps {
  storageKey: string;
  availableColumns: ColumnOption[];
  visibleColumns: string[];
  onChange: (visibleIds: string[]) => void;
}

export const ColumnCustomizerPopover: React.FC<ColumnCustomizerPopoverProps> = ({
  storageKey,
  availableColumns,
  visibleColumns,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (id: string) => {
    let next: string[];
    if (visibleColumns.includes(id)) {
      // Prevent unchecking everything (at least 2 columns visible)
      if (visibleColumns.length <= 2) return;
      next = visibleColumns.filter(c => c !== id);
    } else {
      next = [...visibleColumns, id];
    }
    onChange(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    const defaultIds = availableColumns.filter(c => c.defaultVisible).map(c => c.id);
    onChange(defaultIds);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
        title="Customize visible columns"
      >
        <Columns3 className="w-3.5 h-3.5 text-slate-500" />
        <span>Columns</span>
        <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md text-[10px] font-mono">
          {visibleColumns.length}/{availableColumns.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900">Custom Columns</span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 text-xs">
            {availableColumns.map((col) => {
              const isChecked = visibleColumns.includes(col.id);
              return (
                <label
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer select-none transition-colors ${
                    isChecked ? 'bg-indigo-50/60 text-slate-900 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-xs">{col.label}</span>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                      isChecked
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            Saved automatically in your browser
          </div>
        </div>
      )}
    </div>
  );
};
