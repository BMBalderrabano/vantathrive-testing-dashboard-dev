'use client';

import { useState, useEffect } from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

function VantaBuddyAnimation() {
  const [riveError, setRiveError] = useState(false);
  const [svgError, setSvgError] = useState(false);

  const { rive, RiveComponent } = useRive({
    src: '/vantabuddy.riv',
    stateMachines: 'vantabuddy',
    autoplay: true,
    onLoadError: () => {
      setRiveError(true);
    },
  });

  const turnleftInput = useStateMachineInput(rive, 'vantabuddy', 'turnleft');

  useEffect(() => {
    if (turnleftInput && !riveError) {
      turnleftInput.fire();
    }
  }, [turnleftInput, riveError]);

  if (riveError || !RiveComponent) {
    if (svgError) {
      return (
        <Image
          src="/icon1.png"
          alt="VantaBuddy"
          width={84}
          height={84}
          className="w-20 h-20"
          onError={() => {
            // If PNG also fails, we'll just show nothing
            setSvgError(true);
          }}
        />
      );
    }
    return (
      <Image
        src="/icon0.svg"
        alt="VantaBuddy"
        width={84}
        height={84}
        className="w-20 h-20"
        onError={() => {
          setSvgError(true);
        }}
      />
    );
  }

  return (
    <div className="w-20 h-20 pointer-events-none">
      <RiveComponent />
    </div>
  );
}

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-60 bg-black/50',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          'bg-[var(--card)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-70 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border-3 border-[#2454FF] cursor-default p-6 shadow-lg duration-200 sm:max-w-lg',
          className,
        )}
        {...props}
      >
        {children}
        <div
          style={{
            top: '-25px',
            right: '-25px',
          }}
          className="absolute w-20 h-20 rounded-full pointer-events-none p-1"
        >
          <VantaBuddyAnimation />
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn('text-lg font-semibold text-[#1E3A5F]', className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-[#64748B] text-sm', className)}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(
        buttonVariants({ variant: 'destructive' }),
        'rounded-lg',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(
        buttonVariants({ variant: 'outline' }),
        'border-[#2454FF] text-[#2454FF] rounded-lg',
        className,
      )}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
