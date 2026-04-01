import { Bell, AlertTriangle } from "lucide-react";
import { Breadcrumb } from "./Breadcrumb";
import { StatusIndicator } from "./StatusIndicator";
import { MobileSidebar } from "./MobileSidebar";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <MobileSidebar />
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        <StatusIndicator />
      </div>
    </header>
  );
}
