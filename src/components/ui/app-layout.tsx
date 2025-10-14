"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <div className={cn("min-h-screen natura-bg", className)}>{children}</div>
  );
}

interface AppHeaderProps {
  children: ReactNode;
  className?: string;
}

export function AppHeader({ children, className }: AppHeaderProps) {
  return (
    <header className={cn("natura-header sticky top-0 z-40", className)}>
      {children}
    </header>
  );
}

interface AppSidebarProps {
  children: ReactNode;
  className?: string;
}

export function AppSidebar({ children, className }: AppSidebarProps) {
  return (
    <aside
      className={cn("natura-sidebar fixed inset-y-0 left-0 z-30", className)}
    >
      {children}
    </aside>
  );
}

interface AppMainProps {
  children: ReactNode;
  className?: string;
}

export function AppMain({ children, className }: AppMainProps) {
  return (
    <main className={cn("flex-1 p-6 lg:ml-64", className)}>{children}</main>
  );
}

interface AppContentProps {
  children: ReactNode;
  className?: string;
}

export function AppContent({ children, className }: AppContentProps) {
  return <div className={cn("space-y-8", className)}>{children}</div>;
}

interface AppFooterProps {
  children: ReactNode;
  className?: string;
}

export function AppFooter({ children, className }: AppFooterProps) {
  return (
    <footer className={cn("natura-header border-t", className)}>
      {children}
    </footer>
  );
}

interface AppContainerProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

export function AppContainer({
  children,
  maxWidth = "full",
  className,
}: AppContainerProps) {
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

interface AppSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function AppSection({
  children,
  title,
  description,
  className,
}: AppSectionProps) {
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

interface AppCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function AppCard({
  children,
  title,
  description,
  className,
}: AppCardProps) {
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
