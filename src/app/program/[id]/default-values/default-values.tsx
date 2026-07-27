'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useDefaultValues } from './use-default-values';
import { defaultValuesSchema, type DefaultValuesData } from './schemas';
import { DefaultValuesForm } from './default-values-form';
import { useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

export function DefaultValues() {
  const { values, setValues } = useDefaultValues();

  const form = useForm<DefaultValuesData>({
    resolver: zodResolver(defaultValuesSchema),
    defaultValues: values,
  });

  const formData = useWatch({ control: form.control });
  const debouncedFormData = useDebounce(formData, 500);

  // Auto-save to session on form changes (debounced)
  useEffect(() => {
    if (debouncedFormData && Object.keys(debouncedFormData).length > 0) {
      const isValid = form.formState.isValid;
      if (isValid) {
        setValues(debouncedFormData as DefaultValuesData);
      }
    }
  }, [debouncedFormData, form.formState.isValid, setValues]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card>
          <div className="p-5">
            <h3 className="text-xl font-semibold text-foreground mb-2">Default Exercise Values</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Set default values for exercises added from the library. These values will be used when adding empty exercises.
            </p>
            <form>
              <DefaultValuesForm form={form} formData={formData as DefaultValuesData} />
            </form>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Changes are saved automatically
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
