'use client';

import { ReactNode, useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';

interface Props {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function DashboardLayout({ children, title, subtitle, actions }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-w-0 transition-all duration-300">
        {/* Topbar */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 border-b border-slate-800/60"
          style={{ background: 'rgba(10, 17, 32, 0.95)', backdropFilter: 'blur(12px)' }}
        >
          <div>
            <h1 className="text-base font-semibold text-white tracking-wide">{title}</h1>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            {actions}
            {/* Clock */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/50 bg-slate-800/40">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-time-line text-slate-400 text-sm"></i>
              </div>
              <span className="text-xs font-mono text-slate-300">
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            </div>
            {/* Notifications */}
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:border-slate-600/70 transition-all cursor-pointer">
              <i className="ri-notification-3-line text-sm"></i>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">3</span>
            </button>
            {/* Settings */}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:border-slate-600/70 transition-all cursor-pointer">
              <i className="ri-settings-4-line text-sm"></i>
            </button>
          </div>
        </div>
        {/* Content */}
        <main className="p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
