"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onClear?: () => void;
}

export function SearchInput({
  placeholder = "Rechercher...",
  value,
  onChange,
  className,
  onClear,
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChange("");
    onClear?.();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          "w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200",
          isFocused && "ring-2 ring-green-500 border-green-500"
        )}
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface SearchFiltersProps {
  filters: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
  }[];
  onFilterChange: (filter: string, value: string) => void;
  className?: string;
}

export function SearchFilters({
  filters,
  onFilterChange,
  className,
}: SearchFiltersProps) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {filters.map((filter) => (
        <div key={filter.value} className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">
            {filter.label}:
          </label>
          <select
            onChange={(e) => onFilterChange(filter.value, e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Tous</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

interface SearchResultsProps<T> {
  results: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function SearchResults<T>({
  results,
  renderItem,
  emptyMessage = "Aucun résultat trouvé",
  className,
}: SearchResultsProps<T>) {
  if (results.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {results.map((item, index) => (
        <div key={index}>{renderItem(item)}</div>
      ))}
    </div>
  );
}
