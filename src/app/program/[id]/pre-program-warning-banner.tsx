import { Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export function PreProgramWarningBanner() {
  return (
    <Alert
      className={cn(
        'mb-6 border border-orange-300 bg-orange-50 text-foreground',
        '[&>svg]:text-amber-500',
      )}
    >
      <Zap className="h-4 w-4" aria-hidden />
      <AlertTitle className="text-orange-600 font-semibold">
        You&apos;re editing the PreProgram.
      </AlertTitle>
      <AlertDescription className="text-muted-foreground">
        <p>
          Saving publishes the workout to{' '}
          <span className="font-semibold text-foreground">every user</span> who is
          currently on it — there&apos;s no per-user copy and nothing to re-assign.
          Changes are live immediately.
        </p>
      </AlertDescription>
    </Alert>
  );
}
