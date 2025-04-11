import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: "bg-blue-50 text-blue-700 border-blue-200",
      destructive: "bg-red-50 text-red-700 border-red-200",
      success: "bg-green-50 text-green-700 border-green-200",
      warning: "bg-yellow-50 text-yellow-700 border-yellow-200"
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={twMerge(
          clsx(
            "relative w-full rounded-lg border p-4",
            variantClasses[variant],
            className
          )
        )}
        {...props}
      />
    );
  }
);

Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={twMerge(
      clsx("mb-1 font-medium leading-none tracking-tight", className)
    )}
    {...props}
  />
));

AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={twMerge(
      clsx("text-sm opacity-90", className)
    )}
    {...props}
  />
));

AlertDescription.displayName = "AlertDescription"; 