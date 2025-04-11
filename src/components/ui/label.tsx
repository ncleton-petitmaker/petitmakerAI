import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, htmlFor, ...props }, ref) => {
    return (
      <label
        ref={ref}
        htmlFor={htmlFor}
        className={twMerge(
          clsx(
            "text-sm font-medium text-gray-900",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            className
          )
        )}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label'; 