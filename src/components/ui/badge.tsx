import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'destructive';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: "bg-blue-100 text-blue-800",
      secondary: "bg-gray-100 text-gray-800",
      outline: "border border-gray-200 text-gray-800",
      success: "bg-green-100 text-green-800",
      destructive: "bg-red-100 text-red-800"
    };

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            variantStyles[variant],
            className
          )
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge'; 