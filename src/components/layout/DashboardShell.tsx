import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface DashboardShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardShell({ children, title, subtitle }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar - always visible on md+ */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Main Content Area - responsive margin */}
      <div className="md:ml-64">
        <TopBar title={title} subtitle={subtitle} />
        
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}