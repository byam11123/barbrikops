import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface CustomSelectProps {
  options: CustomSelectOption[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: React.ReactNode;
  ariaLabel?: string;
  align?: 'left' | 'right';
  variant?: 'default' | 'ghost' | 'pill' | 'subtle';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  menuClassName = '',
  size = 'sm',
  disabled = false,
  icon,
  ariaLabel,
  align = 'left',
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options
  const normalizedOptions: CustomSelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  // Size variations
  const sizeClasses = {
    xs: 'py-1 px-2 text-[11px] rounded-lg gap-1.5',
    sm: 'py-1.5 px-2.5 text-xs rounded-xl gap-2',
    md: 'py-2 px-3 text-sm rounded-xl gap-2',
    lg: 'py-2.5 px-4 text-base rounded-2xl gap-2.5',
  };

  // Variant variations
  const variantClasses = {
    default:
      'bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-800 shadow-2xs focus-within:ring-2 focus-within:ring-indigo-500/20',
    ghost:
      'bg-transparent hover:bg-slate-100/80 border-transparent text-slate-700 hover:text-slate-900',
    pill:
      'bg-slate-100/90 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-800 font-semibold rounded-full',
    subtle:
      'bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-slate-700 font-medium',
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        aria-label={ariaLabel || 'Select options'}
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between font-sans transition-all cursor-pointer ${
          sizeClasses[size]
        } ${variantClasses[variant]} ${
          isOpen ? 'ring-2 ring-indigo-500/30 border-indigo-400 bg-white' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          {icon && <span className="text-indigo-600 shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-md font-bold shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-600' : 'group-hover:text-slate-600'
          }`}
        />
      </button>

      {/* Floating Animated Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-full min-w-[160px] max-w-[320px] bg-white rounded-xl shadow-xl border border-slate-200/90 py-1 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 ${menuClassName}`}
        >
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center italic">
                No options available
              </div>
            ) : (
              normalizedOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 text-indigo-900 font-bold'
                        : opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <div className="truncate flex items-center gap-1.5">
                          <span>{opt.label}</span>
                          {opt.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded font-bold">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
