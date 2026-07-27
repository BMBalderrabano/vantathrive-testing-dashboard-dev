'use client';

import Link from 'next/link';
import { Anchor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProgramAssignmentWithTemplate } from '@/lib/supabase/schemas/program-assignments';
import { cn } from '@/lib/utils';

const STATUS_CHIPS = [
  {
    label: 'Always active',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Auto-assigned to all users',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    label: 'Editing updates it for everyone',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
] as const;

const STATUS_CHIP_BASE_CLASS = cn(
  'inline-flex h-7 items-center rounded-md border px-2.5',
  'text-xs font-medium',
);

interface PreProgramCardProps {
  assignment: ProgramAssignmentWithTemplate;
}

export function PreProgramCard({ assignment }: PreProgramCardProps) {
  const template = assignment.program_template;

  if (!template) {
    return null;
  }

  const weeksLabel = `${template.weeks} ${template.weeks === 1 ? 'week' : 'weeks'}`;

  return (
    <div
      className={cn(
        'relative rounded-xl p-px mb-6',
        'bg-linear-to-r from-orange-500 via-amber-400 to-orange-600',
      )}
    >
      <div className="rounded-[calc(var(--radius-xl)-1px)] bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4 min-w-0 flex-1">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg',
                'border border-orange-300/70 bg-[#FFF4E6]',
              )}
              aria-hidden
            >
              <Anchor className="h-7 w-7 text-orange-500" />
            </div>

            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground truncate">
                  {template.name}
                </h2>
                <Badge
                  className={cn(
                    'border-transparent bg-[#2454FF] text-white uppercase',
                    'tracking-wide text-[10px] font-semibold rounded-md px-2 py-0.5',
                  )}
                >
                  Anchored
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{weeksLabel}</span>
                {template.description ? (
                  <>
                    {' '}
                    · {template.description}
                  </>
                ) : null}
              </p>

              <div className="flex flex-wrap gap-2">
                {STATUS_CHIPS.map((chip) => (
                  <span
                    key={chip.label}
                    className={cn(STATUS_CHIP_BASE_CLASS, chip.className)}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Button
            asChild
            className="shrink-0 cursor-pointer bg-[#2454FF] text-white hover:bg-[#1E47D9] shadow-[var(--shadow-md)]"
          >
            <Link href={`/program/${assignment.id}`}>Edit PreProgram</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
