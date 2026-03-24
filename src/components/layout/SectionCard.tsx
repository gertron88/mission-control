import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function SectionCard({
  title,
  children,
  className,
  action,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
