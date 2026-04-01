'use client';

import { ReactNode, useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Clock, Bell, Settings } from 'lucide-react';

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
    <div style={{ minHeight: '100vh', background: '#020617', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '256px', minWidth: 0, transition: 'margin 0.3s' }}>
        {/* Topbar */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
            background: 'rgba(10, 17, 32, 0.95)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'white', letterSpacing: '0.025em' }}>{title}</h1>
            {subtitle && <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{subtitle}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {actions}
            {/* Clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(71, 85, 105, 0.5)', background: 'rgba(30, 41, 59, 0.4)' }}>
              <Clock className="w-4 h-4" style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            </div>
            {/* Notifications */}
            <button style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid rgba(71, 85, 105, 0.5)', background: 'rgba(30, 41, 59, 0.4)', color: '#94a3b8', cursor: 'pointer' }}>
              <Bell className="w-4 h-4" />
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', fontSize: '9px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
            </button>
            {/* Settings */}
            <button style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid rgba(71, 85, 105, 0.5)', background: 'rgba(30, 41, 59, 0.4)', color: '#94a3b8', cursor: 'pointer' }}>
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Content */}
        <main style={{ padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
