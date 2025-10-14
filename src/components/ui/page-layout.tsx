"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("min-h-screen natura-bg", className)}>{children}</div>
  );
}

interface PageContentProps {
  children: ReactNode;
  className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
  return <div className={cn("space-y-8 p-6", className)}>{children}</div>;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center space-x-4">
        {icon && (
          <div className="w-12 h-12 natura-gradient rounded-xl flex items-center justify-center shadow-lg">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold natura-text-gradient">{title}</h1>
          {description && (
            <p className="text-gray-600 text-lg mt-1">{description}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center space-x-3">{children}</div>
      )}
    </div>
  );
}

interface StatsGridProps {
  children: ReactNode;
  className?: string;
}

export function StatsGrid({ children, className }: StatsGridProps) {
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

interface ContentGridProps {
  children: ReactNode;
  className?: string;
}

export function ContentGrid({ children, className }: ContentGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 lg:grid-cols-2", className)}>
      {children}
    </div>
  );
}

interface CardSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function CardSection({
  title,
  description,
  children,
  className,
}: CardSectionProps) {
  return (
    <div className={cn("natura-card", className)}>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
