"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export function Layout({ children, className }: LayoutProps) {
  return (
    <div className={cn("min-h-screen natura-bg", className)}>{children}</div>
  );
}

interface LayoutHeaderProps {
  children: ReactNode;
  className?: string;
}

export function LayoutHeader({ children, className }: LayoutHeaderProps) {
  return (
    <header className={cn("natura-header sticky top-0 z-40", className)}>
      {children}
    </header>
  );
}

interface LayoutSidebarProps {
  children: ReactNode;
  className?: string;
}

export function LayoutSidebar({ children, className }: LayoutSidebarProps) {
  return (
    <aside
      className={cn("natura-sidebar fixed inset-y-0 left-0 z-30", className)}
    >
      {children}
    </aside>
  );
}

interface LayoutMainProps {
  children: ReactNode;
  className?: string;
}

export function LayoutMain({ children, className }: LayoutMainProps) {
  return (
    <main className={cn("flex-1 p-6 lg:ml-64", className)}>{children}</main>
  );
}

interface LayoutContentProps {
  children: ReactNode;
  className?: string;
}

export function LayoutContent({ children, className }: LayoutContentProps) {
  return <div className={cn("space-y-8", className)}>{children}</div>;
}

interface LayoutFooterProps {
  children: ReactNode;
  className?: string;
}

export function LayoutFooter({ children, className }: LayoutFooterProps) {
  return (
    <footer className={cn("natura-header border-t", className)}>
      {children}
    </footer>
  );
}

interface LayoutContainerProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

export function LayoutContainer({
  children,
  maxWidth = "full",
  className,
}: LayoutContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  };

  return (
    <div className={cn("mx-auto w-full", maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );
}

interface LayoutSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function LayoutSection({
  children,
  title,
  description,
  className,
}: LayoutSectionProps) {
  return (
    <section className={cn("space-y-6", className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          )}
          {description && <p className="text-gray-600">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

interface LayoutCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function LayoutCard({
  children,
  title,
  description,
  className,
}: LayoutCardProps) {
  return (
    <div className={cn("natura-card", className)}>
      {(title || description) && (
        <div className="p-6 border-b border-gray-200">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
