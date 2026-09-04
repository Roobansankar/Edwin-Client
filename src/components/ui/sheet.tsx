'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-100 bg-[var(--overlay-bg)] backdrop-blur-sm transition-opacity duration-200',
        'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
        className,
      )}
      {...props}
    />
  );
}

const sideClasses = {
  left: cn(
    'inset-y-0 left-0 h-full w-[280px] border-r transition-transform duration-300 ease-in-out',
    'data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0',
  ),
  bottom: cn(
    'inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl border-t transition-transform duration-300 ease-in-out',
    'data-[state=closed]:translate-y-full data-[state=open]:translate-y-0',
  ),
};

function SheetContent({
  className,
  side,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side: 'left' | 'bottom';
  showClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-101 flex flex-col border-[var(--border)] shadow-2xl outline-none',
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 z-10 cursor-pointer rounded-full p-1.5 transition hover:bg-black/10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('shrink-0 border-b border-[var(--border)] px-4 py-3', className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title className={cn('text-sm font-semibold text-[var(--text-primary)]', className)} {...props} />
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
