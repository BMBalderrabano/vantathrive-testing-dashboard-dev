'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface UpdateDerivedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (updateDerived: boolean) => void;
  loading?: boolean;
}

export function UpdateDerivedDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: UpdateDerivedDialogProps) {
  const [updateDerived, setUpdateDerived] = useState(false);

  const handleConfirm = () => {
    onConfirm(updateDerived);
    setUpdateDerived(false); // Reset for next time
  };

  const handleCancel = () => {
    onOpenChange(false);
    setUpdateDerived(false); // Reset for next time
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Active Programs?</DialogTitle>
          <DialogDescription>
            This is a template. Choose whether to update only this template or
            also update all active programs assigned from this template.
          </DialogDescription>
        </DialogHeader>
        <div
          onClick={() => !loading && setUpdateDerived(!updateDerived)}
          onKeyDown={(e) => {
            if (!loading && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setUpdateDerived(!updateDerived);
            }
          }}
          role="button"
          tabIndex={loading ? -1 : 0}
          className="flex items-center gap-2 py-4 text-left cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          aria-disabled={loading}
        >
          <Checkbox
            checked={updateDerived}
            onCheckedChange={(checked) => setUpdateDerived(checked === true)}
            disabled={loading}
          />
          <span className="text-sm font-medium leading-snug text-foreground">
            Update all derived active programs
          </span>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            type="button"
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading} type="button">
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
