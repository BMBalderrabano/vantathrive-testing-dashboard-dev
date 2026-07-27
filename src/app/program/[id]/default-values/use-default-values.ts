'use client';

import { useState, useCallback } from 'react';
import { TemplateConfigDefaultValues } from '../template-config/template-config';
import type { DefaultValuesData } from './schemas';

const STORAGE_KEY = 'builder-default-values';

const getInitialDefaultValues = (): DefaultValuesData => ({
  sets: TemplateConfigDefaultValues.sets,
  rep: TemplateConfigDefaultValues.rep,
  time: TemplateConfigDefaultValues.time,
  distance: null,
  distanceUnit: 'm',
  weight: null,
  weightUnit: 'kg',
  rest_time: TemplateConfigDefaultValues.rest_time,
  tempo: [null, null, null, null],
});

/**
 * Hook to read and write default values from sessionStorage
 * Falls back to TemplateConfigDefaultValues if no stored values
 */
export function useDefaultValues() {
  const [values, setValuesState] = useState<DefaultValuesData>(() => {
    if (typeof window === 'undefined') {
      return getInitialDefaultValues();
    }

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed as DefaultValuesData;
      }
    } catch (error) {
      console.error('Failed to parse default values from session:', error);
    }

    return getInitialDefaultValues();
  });

  const [isLoading] = useState(false);

  const setValues = useCallback((newValues: DefaultValuesData) => {
    setValuesState(newValues);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newValues));
      } catch (error) {
        console.error('Failed to save default values to session:', error);
      }
    }
  }, []);

  return {
    values,
    setValues,
    isLoading,
  };
}
