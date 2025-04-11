import React, { useState, createContext, useContext, useRef, useEffect, MutableRefObject } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

type PopoverContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: MutableRefObject<HTMLElement | null>;
};

const PopoverContext = createContext<PopoverContextType | undefined>(undefined);

const usePopoverContext = () => {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('Popover components must be used within a Popover');
  }
  return context;
};

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Popover = ({
  children,
  open: controlledOpen,
  onOpenChange,
}: PopoverProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const setOpen = (open: boolean) => {
    if (isControlled) {
      onOpenChange?.(open);
    } else {
      setUncontrolledOpen(open);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !document.querySelector('[data-popover-content]')?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, setOpen]);

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </PopoverContext.Provider>
  );
};

interface PopoverTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ children, asChild = false, ...props }, ref) => {
    const { setOpen, open, triggerRef } = usePopoverContext();
    
    const handleClick = () => {
      setOpen(!open);
    };
    
    // Forward both refs
    const setRefs = (element: HTMLButtonElement | null) => {
      // Update the mutable ref
      triggerRef.current = element;
      
      // Forward the ref
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };
    
    if (asChild) {
      return React.cloneElement(children as React.ReactElement, {
        ref: setRefs,
        onClick: (e: React.MouseEvent) => {
          handleClick();
          (children as React.ReactElement).props.onClick?.(e);
        },
        ...props,
      });
    }

    return (
      <button
        type="button"
        ref={setRefs}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PopoverTrigger.displayName = 'PopoverTrigger';

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'center', sideOffset = 4, ...props }, ref) => {
    const { open, triggerRef } = usePopoverContext();
    const contentRef = useRef<HTMLDivElement | null>(null);
    
    useEffect(() => {
      if (open && triggerRef.current && contentRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();
        
        let left: number;
        if (align === 'start') {
          left = triggerRect.left;
        } else if (align === 'end') {
          left = triggerRect.right - contentRect.width;
        } else {
          left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
        }
        
        // Ensure popover stays within viewport
        left = Math.max(10, Math.min(left, window.innerWidth - contentRect.width - 10));
        
        contentRef.current.style.left = `${left}px`;
        contentRef.current.style.top = `${triggerRect.bottom + sideOffset}px`;
      }
    }, [open, align, sideOffset]);
    
    if (!open) return null;
    
    // Forward both refs
    const setContentRefs = (element: HTMLDivElement | null) => {
      // Update the mutable ref
      contentRef.current = element;
      
      // Forward the ref if it exists
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };
    
    return (
      <div
        ref={setContentRefs}
        data-popover-content
        className={twMerge(
          clsx(
            "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-2 shadow-md",
            "animate-zoom-in-95 animate-fade-in-0",
            className
          )
        )}
        {...props}
      />
    );
  }
);

PopoverContent.displayName = 'PopoverContent'; 