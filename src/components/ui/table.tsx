"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">{children}</table>
    </div>
  );
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return <thead className={cn("bg-gray-50", className)}>{children}</thead>;
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    <tbody className={cn("divide-y divide-gray-200", className)}>
      {children}
    </tbody>
  );
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TableRow({ children, className, onClick }: TableRowProps) {
  return (
    <tr
      className={cn(
        "hover:bg-gray-50 transition-colors",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  onSort?: () => void;
}

export function TableHead({
  children,
  className,
  sortable,
  onSort,
}: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
        sortable && "cursor-pointer hover:text-gray-700",
        className
      )}
      onClick={sortable ? onSort : undefined}
    >
      {children}
    </th>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td className={cn("px-6 py-4 whitespace-nowrap", className)}>{children}</td>
  );
}

interface TableActionsProps {
  children: ReactNode;
  className?: string;
}

export function TableActions({ children, className }: TableActionsProps) {
  return (
    <td
      className={cn(
        "px-6 py-4 whitespace-nowrap text-right text-sm font-medium",
        className
      )}
    >
      <div className="flex items-center space-x-2">{children}</div>
    </td>
  );
}

interface TableEmptyProps {
  message: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function TableEmpty({
  message,
  description,
  icon,
  className,
}: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={100} className={cn("px-6 py-12 text-center", className)}>
        <div className="text-gray-500">
          {icon && <div className="mx-auto mb-4 text-gray-300">{icon}</div>}
          <p className="text-lg font-medium">{message}</p>
          {description && <p className="text-sm mt-1">{description}</p>}
        </div>
      </td>
    </tr>
  );
}

interface TableLoadingProps {
  columns: number;
  rows?: number;
  className?: string;
}

export function TableLoading({
  columns,
  rows = 5,
  className,
}: TableLoadingProps) {
  return (
    <tbody className={cn("animate-pulse", className)}>
      {[...Array(rows)].map((_, rowIndex) => (
        <tr key={rowIndex}>
          {[...Array(columns)].map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
