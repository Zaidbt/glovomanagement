"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveProps {
  children: ReactNode;
  className?: string;
}

export function Responsive({ children, className }: ResponsiveProps) {
  return <div className={cn("w-full", className)}>{children}</div>;
}

interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = "md",
  className,
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  };

  const gridClasses = [
    "grid",
    gapClasses[gap],
    `grid-cols-${cols.sm || 1}`,
    `sm:grid-cols-${cols.sm || 1}`,
    `md:grid-cols-${cols.md || 2}`,
    `lg:grid-cols-${cols.lg || 3}`,
    `xl:grid-cols-${cols.xl || 4}`,
  ].join(" ");

  return <div className={cn(gridClasses, className)}>{children}</div>;
}

interface ResponsiveFlexProps {
  children: ReactNode;
  direction?: "row" | "col";
  wrap?: boolean;
  justify?: "start" | "center" | "end" | "between" | "around";
  align?: "start" | "center" | "end" | "stretch";
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function ResponsiveFlex({
  children,
  direction = "row",
  wrap = false,
  justify = "start",
  align = "start",
  gap = "md",
  className,
}: ResponsiveFlexProps) {
  const directionClasses = {
    row: "flex-row",
    col: "flex-col",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
  };

  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  };

  return (
    <div
      className={cn(
        "flex",
        directionClasses[direction],
        wrap && "flex-wrap",
        justifyClasses[justify],
        alignClasses[align],
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveContainerProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "sm" | "md" | "lg";
  className?: string;
}

export function ResponsiveContainer({
  children,
  maxWidth = "xl",
  padding = "md",
  className,
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  };

  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "mx-auto w-full",
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveTextProps {
  children: ReactNode;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  color?: "primary" | "secondary" | "muted" | "success" | "error" | "warning";
  className?: string;
}

export function ResponsiveText({
  children,
  size = "base",
  weight = "normal",
  color = "primary",
  className,
}: ResponsiveTextProps) {
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
  };

  const weightClasses = {
    light: "font-light",
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  const colorClasses = {
    primary: "text-gray-900",
    secondary: "text-gray-600",
    muted: "text-gray-500",
    success: "text-green-600",
    error: "text-red-600",
    warning: "text-yellow-600",
  };

  return (
    <span
      className={cn(
        sizeClasses[size],
        weightClasses[weight],
        colorClasses[color],
        className
      )}
    >
      {children}
    </span>
  );
}
