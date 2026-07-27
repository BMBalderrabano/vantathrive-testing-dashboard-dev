import { useRef } from 'react';
import { Input } from '@/components/ui/input';

interface TempoInputProps {
  value: (string | null)[];
  onChange: (value: (string | null)[]) => void;
  disabled?: boolean;
}

export function TempoInput({
  value,
  onChange,
  disabled = false,
}: TempoInputProps) {
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleChange = (index: number, newValue: string) => {
    const updated = [...value];
    
    // Handle empty input
    if (!newValue || newValue.trim() === '') {
      updated[index] = null;
      onChange(updated);
      return;
    }
    
    // Validate input - get last character in case of paste
    const lastChar = newValue.slice(-1).toUpperCase();
    
    // All inputs: 0-9 or X
    if (!/^[0-9X]$/.test(lastChar)) {
      return;
    }
    updated[index] = lastChar;

    onChange(updated);

    // Auto-focus next input if value is entered
    if (updated[index] && index < 3) {
      const nextInput = inputRefs[index + 1].current;
      if (nextInput) {
        setTimeout(() => nextInput.focus(), 0);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace navigation
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      // If backspace on empty input, move to previous
      const prevInput = inputRefs[index - 1].current;
      if (prevInput) {
        prevInput.focus();
      }
      return;
    }

    // Prevent invalid characters from being typed
    // Allow: Backspace, Delete, Tab, Arrow keys, etc.
    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key !== 'Backspace' &&
      e.key !== 'Delete' &&
      e.key !== 'Tab'
    ) {
      const char = e.key.toUpperCase();
      
      // All inputs: allow 0-9 or X
      if (!/^[0-9X]$/.test(char)) {
        e.preventDefault();
        return;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();
    
    // Try to parse as tempo format (e.g., "4-2-8-X")
    if (pastedText.includes('-')) {
      const parts = pastedText.split('-').slice(0, 4);
      const updated = [...value];
      parts.forEach((part, i) => {
        if (i < 4) {
          const normalized = part.trim().toUpperCase();
          // All inputs: 0-9 or X
          if (/^[0-9X]$/.test(normalized)) {
            updated[i] = normalized;
          }
        }
      });
      onChange(updated);
      
      // Focus the last input that was filled
      let lastFilledIndex = -1;
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i] !== null) {
          lastFilledIndex = i;
          break;
        }
      }
      if (lastFilledIndex >= 0 && lastFilledIndex < 3) {
        const nextInput = inputRefs[lastFilledIndex + 1].current;
        if (nextInput) {
          setTimeout(() => nextInput.focus(), 0);
        }
      } else if (lastFilledIndex === 3) {
        inputRefs[3].current?.focus();
      }
    } else {
      // Single character paste
      handleChange(index, pastedText);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-1 justify-between">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex items-center">
          <Input
            ref={inputRefs[index]}
            className="w-8 px-1 py-1 border rounded text-xs text-center"
            maxLength={1}
            value={value[index] ?? ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(e, index)}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              (e.target as HTMLInputElement).focus();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            pattern={'[0-9X]'}
            autoComplete="off"
          />
        </div>
      ))}
    </div>
  );
}
