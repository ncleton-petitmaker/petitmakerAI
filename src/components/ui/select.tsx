import React, { createContext, useContext, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

// Context for Select
type SelectContextType = {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SelectContext = createContext<SelectContextType | undefined>(undefined);

const useSelectContext = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select');
  }
  return context;
};

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Select = ({
  value,
  defaultValue = '',
  onValueChange,
  children,
  disabled = false,
}: SelectProps) => {
  const [selectedValue, setSelectedValue] = useState(value || defaultValue);
  const [open, setOpen] = useState(false);

  const handleChange = (newValue: string) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: selectedValue,
        onChange: handleChange,
        open,
        setOpen,
      }}
    >
      <div className="relative" aria-disabled={disabled}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

interface SelectTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { value, open, setOpen } = useSelectContext();

    return (
      <button
        ref={ref}
        type="button"
        className={twMerge(
          clsx(
            "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )
        )}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        {...props}
      >
        {children}
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
          className={`ml-2 h-4 w-4 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    );
  }
);

SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue = ({ 
  children 
}: { 
  children?: React.ReactNode 
}) => {
  const { value } = useSelectContext();
  
  return (
    <span className="block truncate">
      {value ? children : <span className="text-gray-400">Select an option</span>}
    </span>
  );
};

export const SelectContent = ({ 
  children,
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  const { open } = useSelectContext();

  if (!open) return null;

  return (
    <div
      className={twMerge(
        clsx(
          "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg",
          "text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm",
          className
        )
      )}
    >
      {children}
    </div>
  );
};

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  className?: string;
  children?: React.ReactNode;
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue, onChange } = useSelectContext();
    const isSelected = selectedValue === value;

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "relative flex cursor-pointer select-none items-center px-3 py-2",
            "text-gray-900 hover:bg-gray-100",
            isSelected && "bg-blue-50 text-blue-600",
            className
          )
        )}
        onClick={() => onChange(value)}
        {...props}
      >
        <span className="block truncate">{children || value}</span>
        {isSelected && (
          <span className="absolute right-3 flex items-center justify-center">
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
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        )}
      </div>
    );
  }
);

SelectItem.displayName = 'SelectItem'; 