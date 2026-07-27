'use client';

import { useEffect, useState, useCallback } from 'react';
import { Copy, ClipboardPaste, Check, Save } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
interface TemplateConfigActionsProps {
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function TemplateConfigActions({
  onCopy,
  onPaste,
  canPaste,
  onSubmit,
  isSubmitting = false,
}: TemplateConfigActionsProps) {
  const [showCopyCheck, setShowCopyCheck] = useState(false);
  const [showPasteCheck, setShowPasteCheck] = useState(false);
  const [showSaveCheck, setShowSaveCheck] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy();
    setShowCopyCheck(true);
    setTimeout(() => setShowCopyCheck(false), 2000);
  }, [onCopy]);

  const handlePaste = useCallback(() => {
    if (canPaste) {
      onPaste();
      setShowPasteCheck(true);
      setTimeout(() => setShowPasteCheck(false), 2000);
    }
  }, [onPaste, canPaste]);

  const handleSubmit = useCallback(() => {
    if (!isSubmitting) {
      onSubmit();
      setShowSaveCheck(true);
      setTimeout(() => setShowSaveCheck(false), 2000);
    }
  }, [onSubmit, isSubmitting]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          handleCopy();
        } else if (e.key === 'v' || e.key === 'V') {
          if (canPaste) {
            e.preventDefault();
            handlePaste();
          }
        }
      } else if (e.key === 'Enter' && !isInputField) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handlePaste, canPaste, handleSubmit]);

  return (
    <div className="flex gap-2 px-4 py-3 border-t border-border bg-muted/50 rounded-b-[var(--radius-xl)]">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {showCopyCheck ? (
              <Check className="size-4 m-3 cursor-pointer text-[oklch(0.66_0.17_155)]" />
            ) : (
              <Copy
                className="size-4 m-3 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              />
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>Ctrl + C</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {showPasteCheck ? (
              <Check className="size-4 m-3 cursor-pointer text-[oklch(0.66_0.17_155)]" />
            ) : (
              <ClipboardPaste
                className={cn(
                  canPaste
                    ? 'cursor-pointer text-muted-foreground hover:text-foreground'
                    : 'cursor-not-allowed text-muted-foreground/60',
                  'size-4 m-3',
                )}
                onClick={handlePaste}
              />
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>Ctrl + V</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex-1" />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {showSaveCheck ? (
              <Check className="size-4 m-3 cursor-pointer text-[oklch(0.66_0.17_155)]" />
            ) : (
              <Save
                className={cn(
                  'size-4 m-3',
                  isSubmitting
                    ? 'cursor-not-allowed text-muted-foreground/60'
                    : 'cursor-pointer text-muted-foreground hover:text-foreground',
                )}
                onClick={handleSubmit}
              />
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>{isSubmitting ? 'Saving...' : 'Enter'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
