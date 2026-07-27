'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTemplateForm } from './hooks/use-template-form';
import { useModalDrag } from './hooks/use-modal-drag';
import { TemplateConfigHeader } from './partials/header';
import { SetsInput } from './partials/sets-input';
import { TemplateConfigTabs } from './partials/tabs';
import { TemplateConfigForm } from './partials/form';
import { TemplateConfigActions } from './partials/actions';
import type { TemplateConfigProps } from './types';
import type { TemplateFormData } from './schemas';

export const TemplateConfigOffsets = {
  x: 200,
  y: 320,
};

export const TemplateConfigDefaultValues = {
  sets: 3,
  rep: 10,
  time: 60,
  rest_time: 10,
};

export function TemplateConfig({
  item,
  position,
  onClose,
  copiedData,
  onCopy,
  onUpdate,
  onSuccessWithTemplate,
  onSaveStart,
}: TemplateConfigProps) {
  const { modalRef, modalPosition, handleMouseDown } = useModalDrag(position);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    form,
    formData,
    activeTab,
    setActiveTab,
    currentSetIndex,
    setCurrentSetIndex,
    handleSetsChange,
    setCurrentValue,
    handleCopy,
    handlePaste,
    onSubmit,
    isSubmitting,
  } = useTemplateForm(item, onClose, copiedData, onUpdate, onSuccessWithTemplate, onSaveStart);

  // Click outside detection - save on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !isSubmitting
      ) {
        form.handleSubmit(onSubmit)();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalRef, form, onSubmit, isSubmitting]);

  if (!item) return null;

  const exerciseName =
    item.type === 'exercise'
      ? item.data.exercise_name
      : item.data.exercise_name || 'Unnamed Exercise';

  return (
    <motion.div
      ref={modalRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card text-card-foreground rounded-(--radius-xl) shadow-(--shadow-lg) border border-border"
      style={{
        position: 'fixed',
        left: `${modalPosition.x}px`,
        top: `${modalPosition.y}px`,
        width: '280px',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      <TemplateConfigHeader
        exerciseName={exerciseName}
        onClose={onClose}
        onMouseDown={handleMouseDown}
      />

      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)}>
        <SetsInput
          sets={formData.sets || TemplateConfigDefaultValues.sets}
          onChange={handleSetsChange}
          disabled={isSubmitting}
        />

        <TemplateConfigTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentSetIndex={currentSetIndex}
          sets={formData.sets || TemplateConfigDefaultValues.sets}
          onSetIndexChange={setCurrentSetIndex}
        />

        <TemplateConfigForm
          form={form}
          formData={formData as TemplateFormData}
          activeTab={activeTab}
          currentSetIndex={currentSetIndex}
          setCurrentValue={setCurrentValue}
          disabled={isSubmitting}
        />

        <TemplateConfigActions
          onCopy={() => handleCopy(onCopy)}
          onPaste={handlePaste}
          canPaste={!!copiedData}
          onSubmit={form.handleSubmit(onSubmit)}
          isSubmitting={isSubmitting}
        />
      </form>
    </motion.div>
  );
}
