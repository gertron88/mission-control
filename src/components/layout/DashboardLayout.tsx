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
  const [time, setTime] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#020617', display: 'flex' }}>
      <style jsx>{`
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
          }
          .topbar {
            padding: 12px 16px !important;
          }
          .topbar h1 {
            font-size: 14px !important;
          }
          .content-area {
            padding: 16px !important;
          }
        }
      `}</style>
      <Sidebar />
      <div className="main-content" style={{ flex: 1, marginLeft: '256px', minWidth: 0, transition: 'margin 0.3s' }}>
        {/* Topbar */}
        <div
          className="topbar"
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
              <span suppressHydrationWarning style={{ fontSize: '12px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                {time || '--:--:--'}
              </span>
            </div>
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifications(v => !v); setShowSettings(false); }}
                style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid rgba(71, 85, 105, 0.5)', background: 'rgba(30, 41, 59, 0.4)', color: '#94a3b8', cursor: 'pointer' }}
              >
                <Bell className="w-4 h-4" />
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', fontSize: '9px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
              </button>
              {showNotifications && (
                <div style={{ position: 'absolute', right: 0, top: '40px', width: '280px', background: '#1e293b', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '10px', padding: '12px', zIndex: 50, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>Notifications</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ padding: '8px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                      <span style={{ color: '#fbbf24' }}>•</span> Scanner heartbeat received
                    </div>
                    <div style={{ padding: '8px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                      <span style={{ color: '#34d399' }}>•</span> Deployment successful
                    </div>
                    <div style={{ padding: '8px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                      <span style={{ color: '#22d3ee' }}>•</span> New trading API route live
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Settings */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowSettings(v => !v); setShowNotifications(false); }}
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid rgba(71, 85, 105, 0.5)', background: 'rgba(30, 41, 59, 0.4)', color: '#94a3b8', cursor: 'pointer' }}
              >
                <Settings className="w-4 h-4" />
              </button>
              {showSettings && (
                <div style={{ position: 'absolute', right: 0, top: '40px', width: '220px', background: '#1e293b', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '10px', padding: '12px', zIndex: 50, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>Settings</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button style={{ textAlign: 'left', padding: '8px', borderRadius: '6px', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '12px', cursor: 'pointer' }}>Profile</button>
                    <button style={{ textAlign: 'left', padding: '8px', borderRadius: '6px', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '12px', cursor: 'pointer' }}>Integrations</button>
                    <button style={{ textAlign: 'left', padding: '8px', borderRadius: '6px', background: 'transparent', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>Sign Out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Content */}
        <main className="content-area" style={{ padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
