'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusCards from '@/components/dashboard/StatusCards';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <DashboardLayout title="Mission Control" subtitle="Loading...">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ color: '#22d3ee' }}>Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Mission Control"
      subtitle="All systems operational"
    >
      {/* Status cards */}
      <StatusCards />

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Activity feed - 2 cols */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.5)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Activity Feed</h3>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Activity feed coming soon...</p>
        </div>
        {/* Agent grid - 1 col */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.5)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Agent Status</h3>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Agent status coming soon...</p>
        </div>
      </div>

      {/* Bottom metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
        {/* Throughput */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.5)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task Throughput</h3>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>Last 24h</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: '4px', height: '48px' }}>
            {[40, 65, 48, 72, 55, 88, 62, 95, 78, 84, 70, 92].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRadius: '2px',
                  background: 'rgba(6, 182, 212, 0.3)',
                  height: h + '%',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>23 tasks/hr</span>
            <span style={{ fontSize: '10px', color: '#34d399', fontFamily: 'monospace' }}>+18% avg</span>
          </div>
        </div>

        {/* Success rate */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.5)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Rate</h3>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>7-day avg</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
              <svg style={{ width: '64px', height: '64px', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(71,85,105,0.4)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="87.5 100" strokeDashoffset="0" strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>87.5%</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8' }}>Completed</span>
                <span style={{ color: '#34d399', fontFamily: 'monospace' }}>234</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8' }}>Failed</span>
                <span style={{ color: '#f87171', fontFamily: 'monospace' }}>18</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8' }}>Retried</span>
                <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>15</span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget usage */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.5)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget Usage</h3>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#fbbf24' }}>Apr 2026</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'API Credits', used: 68, color: '#06b6d4' },
              { label: 'Compute', used: 45, color: '#a855f7' },
              { label: 'Storage', used: 22, color: '#34d399' },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>{item.label}</span>
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{item.used}%</span>
                </div>
                <div style={{ height: '6px', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: item.color,
                      borderRadius: '9999px',
                      width: item.used + '%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(71, 85, 105, 0.4)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748b' }}>$21,480 spent</span>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>of $40,000</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
