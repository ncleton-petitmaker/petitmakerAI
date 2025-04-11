import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

// Table
export const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={twMerge(
        clsx("w-full caption-bottom text-sm", className)
      )}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

// TableHeader
export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={twMerge(
      clsx("bg-gray-50 border-b", className)
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

// TableBody
export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={twMerge(
      clsx("divide-y divide-gray-200", className)
    )}
    {...props}
  />
));
TableBody.displayName = "TableBody";

// TableRow
export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={twMerge(
      clsx(
        "border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100",
        className
      )
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

// TableHead
export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={twMerge(
      clsx(
        "h-12 px-4 text-left align-middle font-medium text-gray-500",
        "text-xs uppercase tracking-wider",
        className
      )
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

// TableCell
export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={twMerge(
      clsx("p-4 align-middle", className)
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

// TableFooter
export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={twMerge(
      clsx("bg-gray-50 font-medium text-gray-900", className)
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter"; 