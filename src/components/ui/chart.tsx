"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Chart({ title, description, children, className }: ChartProps) {
  return (
    <div className={cn("natura-card p-6", className)}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
      <div className="h-64 flex items-center justify-center">{children}</div>
    </div>
  );
}

interface SimpleBarChartProps {
  data: { label: string; value: number; color?: string }[];
  className?: string;
}

export function SimpleBarChart({ data, className }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className={cn("w-full h-full", className)}>
      <div className="flex items-end justify-between h-full space-x-2">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color || `hsl(${index * 60}, 70%, 50%)`,
              }}
            />
            <div className="mt-2 text-xs text-gray-600 text-center">
              {item.label}
            </div>
            <div className="text-xs font-medium text-gray-900">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SimplePieChartProps {
  data: { label: string; value: number; color?: string }[];
  className?: string;
}

export function SimplePieChart({ data, className }: SimplePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;

  return (
    <div className={cn("w-full h-full", className)}>
      <div className="relative w-48 h-48 mx-auto">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const startAngle = cumulativePercentage * 3.6;
            const endAngle = (cumulativePercentage + percentage) * 3.6;
            cumulativePercentage += percentage;

            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

            const largeArcFlag = percentage > 50 ? 1 : 0;

            const pathData = [
              `M 50 50`,
              `L ${x1} ${y1}`,
              `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `Z`,
            ].join(" ");

            return (
              <path
                key={index}
                d={pathData}
                fill={item.color || `hsl(${index * 60}, 70%, 50%)`}
                className="transition-all duration-300 hover:opacity-80"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: item.color || `hsl(${index * 60}, 70%, 50%)`,
              }}
            />
            <span className="text-sm text-gray-600">{item.label}</span>
            <span className="text-sm font-medium text-gray-900 ml-auto">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
