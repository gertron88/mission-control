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
      <Sidebar />
      
      <div className="ml-64">
        <TopBar title={title} subtitle={subtitle} />
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
