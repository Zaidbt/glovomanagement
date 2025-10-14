"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AppNavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function AppNavItem({
  href,
  icon,
  label,
  isActive,
  onClick,
}: AppNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 natura-hover",
        isActive
          ? "natura-gradient text-white shadow-lg"
          : "text-gray-700 hover:bg-green-50 hover:text-green-700"
      )}
    >
      <span
        className={cn("h-5 w-5", isActive ? "text-white" : "text-gray-500")}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

interface AppNavSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function AppNavSection({
  title,
  children,
  className,
}: AppNavSectionProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </h3>
      <nav className="space-y-1">{children}</nav>
    </div>
  );
}

interface AppNavGroupProps {
  children: ReactNode;
  className?: string;
}

export function AppNavGroup({ children, className }: AppNavGroupProps) {
  return <div className={cn("space-y-1", className)}>{children}</div>;
}

interface AppSidebarProps {
  children: ReactNode;
  className?: string;
}

export function AppSidebar({ children, className }: AppSidebarProps) {
  return (
    <div className={cn("natura-sidebar h-full", className)}>{children}</div>
  );
}

interface AppSidebarHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}

export function AppSidebarHeader({
  title,
  subtitle,
  icon,
  className,
}: AppSidebarHeaderProps) {
  return (
    <div className={cn("flex items-center space-x-3 px-6 py-4", className)}>
      {icon && (
        <div className="w-10 h-10 natura-gradient rounded-lg flex items-center justify-center shadow-lg">
          {icon}
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold natura-text-gradient">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

interface AppSidebarFooterProps {
  children: ReactNode;
  className?: string;
}

export function AppSidebarFooter({
  children,
  className,
}: AppSidebarFooterProps) {
  return (
    <div className={cn("p-4 border-t border-gray-200", className)}>
      {children}
    </div>
  );
}

interface AppNavLinkProps {
  href: string;
  children: ReactNode;
  isActive?: boolean;
  className?: string;
}

export function AppNavLink({
  href,
  children,
  isActive,
  className,
}: AppNavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
        isActive
          ? "natura-gradient text-white shadow-lg"
          : "text-gray-700 hover:bg-green-50 hover:text-green-700",
        className
      )}
    >
      {children}
    </Link>
  );
}

interface AppNavButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AppNavButton({
  onClick,
  children,
  variant = "primary",
  size = "md",
  className,
}: AppNavButtonProps) {
  const variants = {
    primary: "natura-button",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
}
