import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

// Context for Dropdown Menu
type DropdownMenuContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
};

const DropdownMenuContext = createContext<DropdownMenuContextType | undefined>(undefined);

const useDropdownMenuContext = () => {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('Dropdown menu components must be used within a DropdownMenu');
  }
  return context;
};

// DropdownMenu
interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu = ({
  children,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) => {
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
        !document.querySelector('[data-dropdown-content]')?.contains(event.target as Node)
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
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  );
};

// DropdownMenuTrigger
interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, asChild = false, ...props }, ref) => {
    const { setOpen, open, triggerRef } = useDropdownMenuContext();
    
    const handleClick = () => {
      setOpen(!open);
    };
    
    // Forward both refs
    const setRefs = (element: HTMLButtonElement | null) => {
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
        'aria-expanded': open,
        'aria-haspopup': true,
        ...props,
      });
    }

    return (
      <button
        type="button"
        ref={setRefs}
        onClick={handleClick}
        aria-expanded={open}
        aria-haspopup={true}
        {...props}
      >
        {children}
      </button>
    );
  }
);

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

// DropdownMenuContent
interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = 'end', sideOffset = 4, ...props }, ref) => {
    const { open, triggerRef } = useDropdownMenuContext();
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
        
        // Ensure dropdown stays within viewport
        left = Math.max(10, Math.min(left, window.innerWidth - contentRect.width - 10));
        
        contentRef.current.style.left = `${left}px`;
        contentRef.current.style.top = `${triggerRect.bottom + sideOffset}px`;
      }
    }, [open, align, sideOffset]);
    
    if (!open) return null;
    
    // Forward both refs
    const setContentRefs = (element: HTMLDivElement | null) => {
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
        data-dropdown-content
        className={twMerge(
          clsx(
            "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-md",
            "animate-zoom-in-95 animate-fade-in-0",
            className
          )
        )}
        {...props}
      />
    );
  }
);

DropdownMenuContent.displayName = 'DropdownMenuContent';

// DropdownMenuItem
interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, disabled, ...props }, ref) => {
    const { setOpen } = useDropdownMenuContext();
    
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
            "hover:bg-gray-100 focus:bg-gray-100",
            inset && "pl-8",
            disabled && "pointer-events-none opacity-50",
            className
          )
        )}
        onClick={() => !disabled && setOpen(false)}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        {...props}
      />
    );
  }
);

DropdownMenuItem.displayName = 'DropdownMenuItem'; 