import { ReactNode } from "react";
import { cn } from "@/lib/utils";

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

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
  color?: "green" | "blue" | "orange" | "purple" | "red";
  trend?: {
    value: number;
    label: string;
  };
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  color = "green",
  trend,
}: StatsCardProps) {
  const colorClasses = {
    green: "bg-green-100 text-green-600 group-hover:bg-green-200",
    blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-200",
    orange: "bg-orange-100 text-orange-600 group-hover:bg-orange-200",
    purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-200",
    red: "bg-red-100 text-red-600 group-hover:bg-red-200",
  };

  const textColorClasses = {
    green: "text-green-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
    purple: "text-purple-600",
    red: "text-red-600",
  };

  return (
    <div className="natura-card natura-hover group">
      <div className="flex items-center justify-between p-6">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {description && (
            <p className={`text-sm font-medium ${textColorClasses[color]}`}>
              {description}
            </p>
          )}
          {trend && (
            <p className="text-xs text-gray-500 mt-1">
              {trend.value > 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div
          className={`p-3 rounded-lg ${colorClasses[color]} transition-colors`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
