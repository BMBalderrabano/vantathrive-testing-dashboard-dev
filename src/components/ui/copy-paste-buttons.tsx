'use client';

import { ClipboardIcon, CopyIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CopyPasteButtonsProps {
  size?: 'sm' | 'md' | 'lg';
  onCopy: () => void;
  onPaste: () => void;
  isCopied: boolean;
  isPasteDisabled: boolean;
  pasteJustTriggered?: boolean;
  copyTooltip: string;
  pasteTooltip: string;
  copiedTooltip?: string;
  showCopy?: boolean;
  showPaste?: boolean;
}

const sizeClasses = {
  sm: {
    container: '',
    icon: 'h-3 w-3',
    button: 'h-9 px-3',
  },
  md: {
    container: '',
    icon: 'h-4 w-4',
    button: 'h-10 px-4',
  },
  lg: {
    container: '',
    icon: 'h-5 w-5',
    button: 'h-11 px-5',
  },
};

export function CopyPasteButtons({
  size = 'md',
  onCopy,
  onPaste,
  isCopied,
  isPasteDisabled,
  pasteJustTriggered = false,
  copyTooltip,
  pasteTooltip,
  copiedTooltip = 'Already copied',
  showCopy = true,
  showPaste = true,
}: CopyPasteButtonsProps) {
  const sizeClass = sizeClasses[size];

  return (
    <div className={cn('flex items-center gap-2', sizeClass.container)}>
      {showCopy && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onCopy}
              className={cn(
                'flex items-center justify-center rounded-pill transition-colors shadow-sm',
                sizeClass.button,
                isCopied
                  ? 'bg-[oklch(0.66_0.17_155)] cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 cursor-pointer',
              )}
            >
              <CopyIcon className={cn(sizeClass.icon, 'text-white')} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isCopied ? copiedTooltip : copyTooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {showPaste && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={onPaste}
              disabled={isPasteDisabled}
              key={pasteJustTriggered ? 'flash' : 'idle'}
              initial={
                pasteJustTriggered
                  && { backgroundColor: 'oklch(0.66 0.17 155)' }
              }
              animate={
                pasteJustTriggered
                  ? {
                      backgroundColor: [
                        'oklch(0.66 0.17 155)',
                        'oklch(0.58 0.2 220)',
                        'oklch(0.507 0.211 262.705)',
                      ],
                      transition: { duration: 0.5, delay: 0.5 },
                    }
                  : { backgroundColor: 'var(--primary)' }
              }
              className={cn(
                'flex items-center justify-center rounded-pill shadow-sm',
                sizeClass.button,
                isPasteDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:opacity-90',
              )}
            >
              <motion.span
                key={pasteJustTriggered ? 'react' : 'idle'}
                initial={pasteJustTriggered ? { scale: 1 } : false}
                animate={
                  pasteJustTriggered
                    ? { scale: [1, 1.35, 1], transition: { duration: 0.4 } }
                    : { scale: 1 }
                }
                className="flex items-center justify-center"
              >
                <ClipboardIcon className={cn(sizeClass.icon, 'text-white')} />
              </motion.span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isCopied ? copiedTooltip : pasteTooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
