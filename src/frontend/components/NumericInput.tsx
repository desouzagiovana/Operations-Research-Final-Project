import React, { useRef } from 'react';
import { parseNumericValue, isValidNumeric } from '../utils/math';

interface NumericInputProps {
  value: number | string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0',
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const displayValue = value === undefined || value === null ? '' : value.toString();
  const isValid = displayValue === '' || isValidNumeric(displayValue);

  const adjustVal = (amount: number) => {
    if (disabled) return;
    const current = parseNumericValue(value);
    const baseVal = isNaN(current) ? 0 : current;
    const newVal = parseFloat((baseVal + amount).toFixed(4));
    onChange(newVal.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      adjustVal(step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      adjustVal(-step);
    }
  };

  return (
    <div className={`relative flex items-stretch rounded-lg border transition-all bg-white group ${
      !isValid 
        ? 'border-red-400 ring-2 ring-red-100' 
        : 'border-[#e8dcc8] focus-within:border-[#df6a45] focus-within:ring-2 focus-within:ring-[#df6a45]/20'
    } ${className}`}>
      <input
        ref={inputRef}
        type="text"
        className="w-full p-2 pr-6 bg-transparent text-center outline-none text-[#362724] placeholder-gray-400 font-sans"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />
      {/* Helper arrows on hover or focus */}
      <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity pointer-events-auto w-4 select-none">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjustVal(1)}
          className="h-3 text-[8px] text-gray-400 hover:text-[#df6a45] transition-colors flex items-center justify-center cursor-pointer"
          disabled={disabled}
          title="Incrementar (Seta Cima / Shift+Seta)"
        >
          ▲
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjustVal(-1)}
          className="h-3 text-[8px] text-gray-400 hover:text-[#df6a45] transition-colors flex items-center justify-center cursor-pointer"
          disabled={disabled}
          title="Decrementar (Seta Baixo / Shift+Seta)"
        >
          ▼
        </button>
      </div>
    </div>
  );
};
