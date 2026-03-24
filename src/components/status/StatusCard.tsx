import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  status?: "healthy" | "warning" | "critical";
  className?: string;
  isLoading?: boolean;
}

export function StatusCard({
  title,
  value,
  icon: Icon,
  trend,
  status = "healthy",
  className,
  isLoading,
}: StatusCardProps) {
  const statusColors = {
    healthy: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10",
    warning: "border-amber-200 bg-amber-50/50 dark:bg-amber-900/10",
    critical: "border-rose-200 bg-rose-50/50 dark:bg-rose-900/10",
  };

  const iconColors = {
    healthy: "text-emerald-600 bg-emerald-100",
    warning: "text-amber-600 bg-amber-100",
    critical: "text-rose-600 bg-rose-100",
  };

  if (isLoading) {
    return (
      <div className={cn("p-4 rounded-lg border border-slate-200 animate-pulse", className)}>
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
        <div className="h-8 bg-slate-200 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        statusColors[status],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.direction === "up" ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {trend.direction === "up" ? "↑" : "↓"} {trend.value}%
              </span>
              <span className="text-xs text-slate-400">vs last period</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={cn("p-2 rounded-lg", iconColors[status])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
