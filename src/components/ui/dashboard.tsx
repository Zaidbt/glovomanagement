"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardProps {
  children: ReactNode;
  className?: string;
}

export function Dashboard({ children, className }: DashboardProps) {
  return (
    <div className={cn("min-h-screen natura-bg", className)}>{children}</div>
  );
}

interface DashboardHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function DashboardHeader({
  title,
  description,
  icon,
  children,
  className,
}: DashboardHeaderProps) {
  return (
    <div className={cn("text-center space-y-4 mb-8", className)}>
      <div className="inline-flex items-center space-x-3">
        {icon && (
          <div className="w-12 h-12 natura-gradient rounded-xl flex items-center justify-center shadow-lg">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-4xl font-bold natura-text-gradient">{title}</h1>
          {description && (
            <p className="text-gray-600 text-lg mt-2">{description}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center justify-center space-x-3">
          {children}
        </div>
      )}
    </div>
  );
}

interface DashboardStatsProps {
  children: ReactNode;
  className?: string;
}

export function DashboardStats({ children, className }: DashboardStatsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

interface DashboardContentProps {
  children: ReactNode;
  className?: string;
}

export function DashboardContent({
  children,
  className,
}: DashboardContentProps) {
  return <div className={cn("space-y-8 p-6", className)}>{children}</div>;
}

interface DashboardCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function DashboardCard({
  title,
  description,
  children,
  className,
}: DashboardCardProps) {
  return (
    <div className={cn("natura-card", className)}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mb-4">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 lg:grid-cols-2", className)}>
      {children}
    </div>
  );
}

interface DashboardSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  description,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
