"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormProps {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export function Form({ children, onSubmit, className }: FormProps) {
  return (
    <form onSubmit={onSubmit} className={cn("space-y-6", className)}>
      {children}
    </form>
  );
}

interface FormGroupProps {
  children: ReactNode;
  className?: string;
}

export function FormGroup({ children, className }: FormGroupProps) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

interface FormLabelProps {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}

export function FormLabel({
  children,
  htmlFor,
  required,
  className,
}: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "block text-sm font-medium text-gray-700",
        required && "after:content-['*'] after:ml-1 after:text-red-500",
        className
      )}
    >
      {children}
    </label>
  );
}

interface FormInputProps {
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function FormInput({
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  disabled,
  error,
  className,
}: FormInputProps) {
  return (
    <div className="space-y-1">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200",
          error && "border-red-500 focus:ring-red-500 focus:border-red-500",
          disabled && "bg-gray-100 cursor-not-allowed",
          className
        )}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  rows?: number;
  className?: string;
}

export function FormTextarea({
  value,
  onChange,
  placeholder,
  required,
  disabled,
  error,
  rows = 3,
  className,
}: FormTextareaProps) {
  return (
    <div className="space-y-1">
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200",
          error && "border-red-500 focus:ring-red-500 focus:border-red-500",
          disabled && "bg-gray-100 cursor-not-allowed",
          className
        )}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormSelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function FormSelect({
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
  error,
  className,
}: FormSelectProps) {
  return (
    <div className="space-y-1">
      <select
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200",
          error && "border-red-500 focus:ring-red-500 focus:border-red-500",
          disabled && "bg-gray-100 cursor-not-allowed",
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormButtonProps {
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function FormButton({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled,
  loading,
  onClick,
  className,
}: FormButtonProps) {
  const variants = {
    primary: "bg-green-600 hover:bg-green-700 text-white",
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
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
        variants[variant],
        sizes[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
      )}
      {children}
    </button>
  );
}
