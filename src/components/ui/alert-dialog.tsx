import React, { createContext, useContext, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

// Context
type AlertDialogContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AlertDialogContext = createContext<AlertDialogContextType | undefined>(undefined);

const useAlertDialogContext = () => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error('Alert dialog components must be used within an AlertDialog');
  }
  return context;
};

// AlertDialog
interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const AlertDialog = ({
  children,
  open: controlledOpen,
  onOpenChange,
}: AlertDialogProps) => {
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
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
};

// AlertDialogTrigger
interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const AlertDialogTrigger = React.forwardRef<HTMLButtonElement, AlertDialogTriggerProps>(
  ({ children, asChild = false, ...props }, ref) => {
    const { setOpen } = useAlertDialogContext();
    
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

AlertDialogTrigger.displayName = 'AlertDialogTrigger';

// AlertDialogContent
interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const AlertDialogContent = React.forwardRef<HTMLDivElement, AlertDialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open } = useAlertDialogContext();
    
    if (!open) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
          aria-hidden="true"
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
          role="alertdialog"
          aria-modal="true"
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);

AlertDialogContent.displayName = 'AlertDialogContent';

// AlertDialogHeader
export const AlertDialogHeader = ({
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

AlertDialogHeader.displayName = 'AlertDialogHeader';

// AlertDialogTitle
export const AlertDialogTitle = React.forwardRef<
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

AlertDialogTitle.displayName = 'AlertDialogTitle';

// AlertDialogDescription
export const AlertDialogDescription = React.forwardRef<
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

AlertDialogDescription.displayName = 'AlertDialogDescription';

// AlertDialogFooter
export const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={twMerge(
      clsx(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-5",
        className
      )
    )}
    {...props}
  />
);

AlertDialogFooter.displayName = 'AlertDialogFooter';

// AlertDialogAction
export const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { setOpen } = useAlertDialogContext();
  
  return (
    <button
      ref={ref}
      className={twMerge(
        clsx(
          "inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white",
          "hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          className
        )
      )}
      onClick={() => setOpen(false)}
      {...props}
    />
  );
});

AlertDialogAction.displayName = 'AlertDialogAction';

// AlertDialogCancel
export const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { setOpen } = useAlertDialogContext();
  
  return (
    <button
      ref={ref}
      className={twMerge(
        clsx(
          "mt-2 sm:mt-0 inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700",
          "hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
          className
        )
      )}
      onClick={() => setOpen(false)}
      {...props}
    />
  );
});

AlertDialogCancel.displayName = 'AlertDialogCancel'; 