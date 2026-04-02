'use client';

import { useState, useEffect } from 'react';

interface SuccessRateData {
  rate: number;
  completed: number;
  failed: number;
  retried: number;
}

export default function SuccessRateChart() {
  const [data, setData] = useState<SuccessRateData>({
    rate: 0,
    completed: 0,
    failed: 0,
    retried: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSuccessRate() {
      try {
        const response = await fetch('/api/metrics/success-rate');
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setData(result);
      } catch (err) {
        // Fallback to zeros
        setData({ rate: 0, completed: 0, failed: 0, retried: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchSuccessRate();
    
    // Poll every 5 minutes
    const interval = setInterval(fetchSuccessRate, 300000);
    return () => clearInterval(interval);
  }, []);

  const circumference = 2 * Math.PI * 15;
  const strokeDasharray = `${(data.rate / 100) * circumference} ${circumference}`;

  const hasData = data.completed > 0 || data.failed > 0;

  return (
    <div style={{ 
      background: 'rgba(30, 41, 59, 0.5)', 
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(71, 85, 105, 0.4)',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Success Rate
        </h3>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>7-day avg</span>
      </div>

      {loading ? (
        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          Loading...
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
            <svg style={{ width: '64px', height: '64px', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(71,85,105,0.4)" strokeWidth="3" />
              <circle 
                cx="18" 
                cy="18" 
                r="15" 
                fill="none" 
                stroke={hasData ? "#10b981" : "#475569"} 
                strokeWidth="3" 
                strokeDasharray={hasData ? strokeDasharray : "0 100"}
                strokeDashoffset="0" 
                strokeLinecap="round" 
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: hasData ? '#34d399' : '#64748b', fontFamily: 'monospace' }}>
                {hasData ? `${data.rate.toFixed(1)}%` : '--'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#94a3b8' }}>Completed</span>
              <span style={{ color: '#34d399', fontFamily: 'monospace' }}>{data.completed}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#94a3b8' }}>Failed</span>
              <span style={{ color: '#f87171', fontFamily: 'monospace' }}>{data.failed}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#94a3b8' }}>Retried</span>
              <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{data.retried}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
