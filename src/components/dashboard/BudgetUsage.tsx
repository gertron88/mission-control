'use client';

import { useState, useEffect } from 'react';

interface BudgetData {
  apiCredits: { used: number; limit: number };
  compute: { used: number; limit: number };
  storage: { used: number; limit: number };
  totalSpent: number;
  totalBudget: number;
}

export default function BudgetUsage() {
  const [data, setData] = useState<BudgetData>({
    apiCredits: { used: 0, limit: 100 },
    compute: { used: 0, limit: 100 },
    storage: { used: 0, limit: 100 },
    totalSpent: 0,
    totalBudget: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBudget() {
      try {
        const response = await fetch('/api/metrics/budget');
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setData(result);
      } catch (err) {
        // Keep zeros
        setData({
          apiCredits: { used: 0, limit: 100 },
          compute: { used: 0, limit: 100 },
          storage: { used: 0, limit: 100 },
          totalSpent: 0,
          totalBudget: 0
        });
      } finally {
        setLoading(false);
      }
    }
    fetchBudget();
    
    // Poll every 5 minutes
    const interval = setInterval(fetchBudget, 300000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: 'API Credits', used: data.apiCredits.used, limit: data.apiCredits.limit, color: '#06b6d4' },
    { label: 'Compute', used: data.compute.used, limit: data.compute.limit, color: '#a855f7' },
    { label: 'Storage', used: data.storage.used, limit: data.storage.limit, color: '#34d399' },
  ];

  const hasBudget = data.totalBudget > 0;

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
          Budget Usage
        </h3>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#fbbf24' }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
      </div>

      {loading ? (
        <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          Loading...
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((item) => {
              const percent = item.limit > 0 ? (item.used / item.limit) * 100 : 0;
              return (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>{item.label}</span>
                    <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>
                      {item.used > 0 ? `${percent.toFixed(0)}%` : '--'}
                    </span>
                  </div>
                  <div style={{ height: '6px', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: item.color,
                        borderRadius: '9999px',
                        width: `${Math.min(percent, 100)}%`,
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(71, 85, 105, 0.4)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748b' }}>
              {hasBudget ? `$${data.totalSpent.toLocaleString()} spent` : 'Budget tracking inactive'}
            </span>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>
              {hasBudget ? `of $${data.totalBudget.toLocaleString()}` : ''}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
