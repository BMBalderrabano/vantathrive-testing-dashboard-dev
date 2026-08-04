'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { assignProgram, clearProgram } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import toast from 'react-hot-toast';

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function resolveUserLabel(
  userId: string,
  users: User[],
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null,
): string {
  if (profile?.email?.trim()) {
    return profile.email.trim();
  }
  const profileName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ');
  if (profileName) {
    return profileName;
  }

  const user = users.find((u) => u.id === userId);
  if (user?.email?.trim()) {
    return user.email.trim();
  }
  const userName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  if (userName) {
    return userName;
  }
  return userId;
}

interface QuickAssignDialogProps {
  programName: string;
  programTemplateId: string;
  organizationId?: string | null;
  selectedUserId: string;
  users: User[];
  onSuccess: () => void;
}

export function QuickAssignDialog({
  programName,
  programTemplateId,
  organizationId,
  selectedUserId,
  users,
  onSuccess,
}: QuickAssignDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [startDate, setStartDate] = React.useState(todayDateString);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStartDate(todayDateString());
    }
  }, [open]);

  const userLabel = selectedUserId
    ? resolveUserLabel(selectedUserId, users)
    : null;
  const hasSelectedUser = Boolean(selectedUserId);

  const handleAssign = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!selectedUserId || !startDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await assignProgram({
        user_id: selectedUserId,
        program_template_id: programTemplateId,
        start_date: startDate,
        organization_id: organizationId ?? undefined,
      });
      toast.success(result.message ?? 'Program assigned');
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to assign program:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to assign program',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerButton = (
    <Button
      variant="secondary"
      size="sm"
      className="font-semibold cursor-pointer shadow-(--shadow-sm)"
      disabled={!hasSelectedUser}
      onClick={(e) => e.stopPropagation()}
    >
      Quick assign
    </Button>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {hasSelectedUser ? (
        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
          {triggerButton}
        </AlertDialogTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex"
              onClick={(e) => e.stopPropagation()}
            >
              {triggerButton}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select a user in the header to quick assign</p>
          </TooltipContent>
        </Tooltip>
      )}
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Quick assign program</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                Assign <span className="font-medium text-foreground">{programName}</span>{' '}
                to{' '}
                <span className="font-medium text-foreground">
                  {userLabel ?? 'selected user'}
                </span>
                .
              </p>
              <div className="space-y-2">
                <label
                  htmlFor="quick-assign-start-date"
                  className="text-sm font-medium text-foreground"
                >
                  Start date
                </label>
                <Input
                  id="quick-assign-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <Button
            className={cn(buttonVariants({ variant: 'default' }), 'rounded-lg cursor-pointer')}
            onClick={handleAssign}
            disabled={isSubmitting || !startDate}
          >
            {isSubmitting ? 'Assigning...' : 'Assign'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface QuickDeassignDialogProps {
  targetUserId: string | null | undefined;
  users: User[];
  assignedProfile?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
  onSuccess: () => void;
}

export function QuickDeassignDialog({
  targetUserId,
  users,
  assignedProfile,
  onSuccess,
}: QuickDeassignDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const hasTargetUser = Boolean(targetUserId);
  const userLabel = targetUserId
    ? resolveUserLabel(targetUserId, users, assignedProfile)
    : null;

  const handleDeassign = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!targetUserId) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await clearProgram(targetUserId);
      toast.success(result.message ?? 'Active program assignments cleared');
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to clear program:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to clear program',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerButton = (
    <Button
      variant="secondary"
      size="sm"
      className="font-semibold cursor-pointer shadow-(--shadow-sm)"
      disabled={!hasTargetUser}
      onClick={(e) => e.stopPropagation()}
    >
      Quick deassign
    </Button>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {hasTargetUser ? (
        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
          {triggerButton}
        </AlertDialogTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex"
              onClick={(e) => e.stopPropagation()}
            >
              {triggerButton}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>No assigned user found for this program</p>
          </TooltipContent>
        </Tooltip>
      )}
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Quick deassign program</AlertDialogTitle>
          <AlertDialogDescription>
            Clear all active (non–pre-program) assignments for{' '}
            <span className="font-medium text-foreground">
              {userLabel ?? 'this user'}
            </span>
            ? Pre-program assignments will be kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <Button
            className={cn(
              buttonVariants({ variant: 'destructive' }),
              'rounded-lg cursor-pointer',
            )}
            onClick={handleDeassign}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Clearing...' : 'Clear assignments'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
