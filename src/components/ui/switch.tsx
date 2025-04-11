import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="relative inline-flex h-6 w-11 items-center rounded-full">
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <span
          className={twMerge(
            clsx(
              "absolute inset-0 cursor-pointer rounded-full transition-colors",
              "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2",
              checked ? "bg-blue-600" : "bg-gray-300",
              className
            )
          )}
        />
        <span
          className={clsx(
            "absolute h-5 w-5 rounded-full bg-white transition-transform",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </div>
    );
  }
);

Switch.displayName = 'Switch'; 