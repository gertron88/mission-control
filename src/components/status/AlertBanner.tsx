"use client";

import { cn } from "@/lib/utils";

interface AlertBannerProps {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "default" | "destructive";
  };
  onDismiss?: () => void;
}

const styles = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  error: "bg-rose-50 border-rose-200 text-rose-800",
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
};

export function AlertBanner({
  type,
  title,
  message,
  action,
  onDismiss,
}: AlertBannerProps) {
  return (
    <div className={cn("rounded-lg border p-4 mb-6", styles[type])}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          {message && <p className="text-sm mt-1 opacity-90">{message}</p>}
        </div>

        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              "ml-4 px-3 py-1.5 rounded text-sm font-medium",
              action.variant === "destructive"
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-white hover:bg-slate-50 border"
            )}
          >
            {action.label}
          </button>
        )}

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-sm opacity-60 hover:opacity-100"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
