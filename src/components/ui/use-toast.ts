import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

let toastCount = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ title, description, variant = "default" }: Omit<Toast, "id">) => {
      const id = `toast-${++toastCount}`;
      const newToast: Toast = {
        id,
        title,
        description,
        variant,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);

      return {
        id,
        dismiss: () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        update: (props: Partial<Toast>) =>
          setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...props } : t))
          ),
      };
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}
