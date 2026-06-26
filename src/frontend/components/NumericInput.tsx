import React, { useRef } from 'react';
import { parseNumericValue, isValidNumeric } from '../utils/math';

interface NumericInputProps {
  value: number | string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0',
  disabled = false,
  min,
  max,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const displayValue = value === undefined || value === null ? '' : value.toString();
  const isValid = displayValue === '' || isValidNumeric(displayValue);

  const cleanLeadingZeros = (val: string): string => {
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 2) {
        const num = parts[0].replace(/^(-?)0+(?=\d)/, '$1');
        const den = parts[1].replace(/^(-?)0+(?=\d)/, '$1');
        return `${num}/${den}`;
      }
    }
    return val.replace(/^(-?)0+(?=\d)/, '$1');
  };

  const adjustVal = (amount: number) => {
    if (disabled) return;
    const current = parseNumericValue(value);
    const baseVal = isNaN(current) ? 0 : current;
    let newVal = parseFloat((baseVal + amount).toFixed(4));

    if (min !== undefined) {
      const minNum = typeof min === 'number' ? min : parseFloat(min);
      if (!isNaN(minNum) && newVal < minNum) {
        newVal = minNum;
      }
    }
    if (max !== undefined) {
      const maxNum = typeof max === 'number' ? max : parseFloat(max);
      if (!isNaN(maxNum) && newVal > maxNum) {
        newVal = maxNum;
      }
    }

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanedVal = cleanLeadingZeros(rawVal);
    onChange(cleanedVal);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).select();
  };

  const handleBlur = () => {
    let cleaned = cleanLeadingZeros(displayValue);
    
    if (cleaned.trim() === '') {
      if (min !== undefined) {
        onChange(min.toString());
      } else {
        onChange('0');
      }
      return;
    }
    
    if (!isValidNumeric(cleaned)) {
      onChange('0');
      return;
    }
    
    if (min !== undefined || max !== undefined) {
      const currentNum = parseNumericValue(cleaned);
      if (!isNaN(currentNum)) {
        let boundedVal = currentNum;
        if (min !== undefined) {
          const minNum = typeof min === 'number' ? min : parseFloat(min);
          if (!isNaN(minNum) && boundedVal < minNum) {
            boundedVal = minNum;
          }
        }
        if (max !== undefined) {
          const maxNum = typeof max === 'number' ? max : parseFloat(max);
          if (!isNaN(maxNum) && boundedVal > maxNum) {
            boundedVal = maxNum;
          }
        }
        onChange(boundedVal.toString());
        return;
      }
    }
    
    onChange(cleaned);
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
        inputMode="decimal"
        className="w-full p-2 pr-6 bg-transparent text-center outline-none text-[#362724] placeholder-gray-400 font-sans"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onClick={handleClick}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
      />
      {/* Helper arrows, always visible but interactive */}
      <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center gap-0.5 pointer-events-auto w-4 select-none">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjustVal(1)}
          className="h-3.5 text-[9px] text-gray-400 hover:text-[#df6a45] active:text-[#c25938] transition-colors flex items-center justify-center cursor-pointer"
          disabled={disabled}
          title="Incrementar (Seta Cima / Shift+Seta)"
        >
          ▲
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjustVal(-1)}
          className="h-3.5 text-[9px] text-gray-400 hover:text-[#df6a45] active:text-[#c25938] transition-colors flex items-center justify-center cursor-pointer"
          disabled={disabled}
          title="Decrementar (Seta Baixo / Shift+Seta)"
        >
          ▼
        </button>
      </div>
    </div>
  );
};
