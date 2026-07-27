import { useEffect, useState, useRef } from 'react';

export function useDebounce<T>(
  value: T,
  delay: number = 300,
  onChange?: (value: T) => void,
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      if (!isFirstRender.current && onChange) {
        onChange(value);
      }
      isFirstRender.current = false;
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, onChange]);

  return debouncedValue;
}
