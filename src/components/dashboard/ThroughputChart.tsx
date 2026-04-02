'use client';

import { useState, useEffect } from 'react';

interface HourlyData {
  hour: string;
  count: number;
}

export default function ThroughputChart() {
  const [data, setData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTasks, setTotalTasks] = useState(0);

  useEffect(() => {
    async function fetchThroughput() {
      try {
        const response = await fetch('/api/metrics/throughput');
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setData(result.data || []);
        setTotalTasks(result.total || 0);
      } catch (err) {
        // Fallback to empty
        setData([]);
        setTotalTasks(0);
      } finally {
        setLoading(false);
      }
    }
    fetchThroughput();
    
    // Poll every minute
    const interval = setInterval(fetchThroughput, 60000);
    return () => clearInterval(interval);
  }, []);

  // Generate placeholder data if empty
  const displayData = data.length > 0 ? data : Array(12).fill(0).map((_, i) => ({
    hour: `${i * 2}:00`,
    count: 0
  }));

  const maxCount = Math.max(...displayData.map(d => d.count), 1);

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
          Task Throughput
        </h3>
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>Last 24h</span>
      </div>

      {loading ? (
        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          Loading...
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'end', gap: '4px', height: '48px' }}>
            {displayData.map((d, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRadius: '2px',
                  background: d.count > 0 ? 'rgba(6, 182, 212, 0.6)' : 'rgba(6, 182, 212, 0.15)',
                  height: `${(d.count / maxCount) * 100}%`,
                  minHeight: d.count > 0 ? '4px' : '2px',
                  transition: 'height 0.3s'
                }}
                title={`${d.hour}: ${d.count} tasks`}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
              {totalTasks} tasks total
            </span>
            <span style={{ fontSize: '10px', color: '#34d399', fontFamily: 'monospace' }}>
              {data.length > 0 ? 'Live data' : 'Awaiting data'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
