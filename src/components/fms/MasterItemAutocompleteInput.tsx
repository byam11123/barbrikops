import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Boxes } from 'lucide-react';
import { InventoryItem } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface MasterItemAutocompleteInputProps {
  value: string;
  onChange: (value: string, selectedItem?: InventoryItem) => void;
  placeholder?: string;
  className?: string;
}

export const MasterItemAutocompleteInput: React.FC<MasterItemAutocompleteInputProps> = ({
  value,
  onChange,
  placeholder = 'Search item in master catalog (e.g. TYRE)...',
  className = '',
}) => {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpwards: boolean;
  }>({ top: 0, left: 0, width: 0, openUpwards: false });

  // Load inventory items
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() =>
    storageAdapter.getInventoryItems()
  );

  useEffect(() => {
    setInventoryItems(storageAdapter.getInventoryItems());
  }, [isOpen]);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const updateCoords = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const estimatedHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    setCoords({
      top: openUpwards ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUpwards,
    });
  }, []);

  // Find exact match by name or itemId
  const matchedItem = inventoryItems.find(
    (i) =>
      i.name.toLowerCase().trim() === query.toLowerCase().trim() ||
      i.itemId.toLowerCase().trim() === query.toLowerCase().trim()
  );

  // Filter options based on typed query (ONLY when user has typed at least 1 character)
  const filtered = query.trim().length >= 1
    ? inventoryItems
        .filter((i) => {
          const q = query.toLowerCase().trim();
          return (
            i.name.toLowerCase().includes(q) ||
            i.itemId.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q)
          );
        })
        .slice(0, 10)
    : [];

  // Update coords on open, close on scroll outside dropdown
  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    const handleResize = () => {
      updateCoords();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateCoords]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInput = containerRef.current && containerRef.current.contains(target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      if (!clickedInput && !clickedDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: InventoryItem) => {
    setQuery(item.name);
    setIsOpen(false);
    onChange(item.name, item);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    if (newVal.trim().length >= 1) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
    const match = inventoryItems.find(
      (i) =>
        i.name.toLowerCase().trim() === newVal.toLowerCase().trim() ||
        i.itemId.toLowerCase().trim() === newVal.toLowerCase().trim()
    );
    onChange(newVal, match);
  };

  const handleFocus = () => {
    if (query.trim().length >= 1) {
      updateCoords();
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={handleFocus}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full text-xs border rounded-md px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 transition-all ${
            matchedItem
              ? 'bg-emerald-50/50 border-emerald-300 focus:ring-emerald-500'
              : 'bg-slate-50 border-slate-200 focus:ring-indigo-500'
          } ${className}`}
        />
        <Search className="w-3.5 h-3.5 absolute right-2 text-slate-400 pointer-events-none" />
      </div>

      {/* Floating Autocomplete Popup Portal - breaks out of all parent overflow containers */}
      {isOpen && query.trim().length >= 1 && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: Math.max(coords.width, 280),
              transform: coords.openUpwards ? 'translateY(-100%)' : undefined,
              zIndex: 9999,
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800"
          >
            {filtered.length > 0 ? (
              <>
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <Boxes className="w-3 h-3 text-indigo-500" />
                    <span>Master Inventory ({filtered.length} results)</span>
                  </span>
                  <span className="text-slate-400 font-normal">Top 10</span>
                </div>
                {filtered.map((item) => (
                  <button
                    key={item.id || item.itemId}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item);
                    }}
                    className="w-full text-left p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{item.itemId}</span> • {item.category} • {item.location}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                        {item.currentStock} {item.unit}
                      </span>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <div className="p-3 text-center text-xs text-rose-600 font-semibold bg-rose-50/40">
                No inventory item found. Please contact the Store Manager.
              </div>
            )}
          </div>,
          document.body
        )
      }
    </div>
  );
};
