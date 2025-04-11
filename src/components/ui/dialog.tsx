import React, { useState, createContext, useContext } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

// Context
type DialogContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

const useDialogContext = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
};

// Dialog
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog = ({
  children,
  open: controlledOpen,
  onOpenChange,
}: DialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const setOpen = (open: boolean) => {
    if (isControlled) {
      onOpenChange?.(open);
    } else {
      setUncontrolledOpen(open);
    }
  };

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

// DialogTrigger
interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ children, asChild = false, ...props }, ref) => {
    const { setOpen } = useDialogContext();
    
    if (asChild) {
      return React.cloneElement(children as React.ReactElement, {
        ...props,
        ref,
        onClick: (e: React.MouseEvent) => {
          setOpen(true);
          (children as React.ReactElement).props.onClick?.(e);
        },
      });
    }

    return (
      <button
        type="button"
        ref={ref}
        onClick={() => setOpen(true)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

DialogTrigger.displayName = 'DialogTrigger';

// DialogContent
interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useDialogContext();
    
    if (!open) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
          onClick={() => setOpen(false)}
        />
        <div
          ref={ref}
          className={twMerge(
            clsx(
              "relative z-50 max-h-[85vh] w-full max-w-md overflow-hidden rounded-lg bg-white p-6 shadow-lg",
              "animate-zoom-in-95 animate-fade-in-0",
              className
            )
          )}
          {...props}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
            onClick={() => setOpen(false)}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
            <span className="sr-only">Close</span>
          </button>
          {children}
        </div>
      </div>
    );
  }
);

DialogContent.displayName = 'DialogContent';

// DialogHeader
export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={twMerge(
      clsx("flex flex-col space-y-1.5 text-center sm:text-left", className)
    )}
    {...props}
  />
);

DialogHeader.displayName = 'DialogHeader';

// DialogTitle
export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={twMerge(
      clsx("text-lg font-semibold leading-none tracking-tight", className)
    )}
    {...props}
  />
));

DialogTitle.displayName = 'DialogTitle';

// DialogDescription
export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={twMerge(
      clsx("text-sm text-gray-500", className)
    )}
    {...props}
  />
));

DialogDescription.displayName = 'DialogDescription';

// DialogFooter
export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={twMerge(
      clsx(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )
    )}
    {...props}
  />
);

DialogFooter.displayName = 'DialogFooter'; 