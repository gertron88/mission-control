'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { TrendingUp, TrendingDown, DollarSign, Activity, AlertTriangle, Clock } from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  executedAt: string;
  agent: string;
}

export default function TradingPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState({
    totalPnl: 0,
    openPositions: 0,
    totalTrades: 0,
    winRate: 0
  });

  useEffect(() => {
    async function fetchTradingData() {
      try {
        const [positionsRes, tradesRes] = await Promise.all([
          fetch('/api/trading/positions'),
          fetch('/api/trading/trades')
        ]);
        
        if (positionsRes.ok) {
          const posData = await positionsRes.json();
          setPositions(posData);
        }
        if (tradesRes.ok) {
          const tradeData = await tradesRes.json();
          setTrades(tradeData);
        }
      } catch (err) {
        // Use empty data
        setPositions([]);
        setTrades([]);
      }
    }
    fetchTradingData();
  }, []);

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <DashboardLayout
      title="Trading"
      subtitle={`${positions.length} open positions • $${totalPnl.toFixed(2)} P&L`}
    >
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total P&L', value: `$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? '#34d399' : '#f87171', icon: DollarSign },
          { label: 'Open Positions', value: positions.length.toString(), color: '#22d3ee', icon: Activity },
          { label: 'Total Trades', value: trades.length.toString(), color: '#fbbf24', icon: TrendingUp },
          { label: 'Win Rate', value: `${stats.winRate}%`, color: '#a78bfa', icon: TrendingDown },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color, fontFamily: 'monospace' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Positions & Recent Trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Open Positions */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
            Open Positions
          </h3>
          {positions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <Activity className="w-8 h-8" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>No open positions</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {positions.map((pos) => (
                <div key={pos.id} style={{
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${pos.pnl >= 0 ? '#34d399' : '#f87171'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{pos.symbol}</span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: pos.side === 'LONG' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: pos.side === 'LONG' ? '#34d399' : '#f87171'
                    }}>{pos.side}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Size: {pos.size}</span>
                    <span style={{ color: pos.pnl >= 0 ? '#34d399' : '#f87171', fontFamily: 'monospace' }}>
                      {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)} ({pos.pnlPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
            Recent Trades
          </h3>
          {trades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <Clock className="w-8 h-8" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>No recent trades</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trades.slice(0, 10).map((trade) => (
                <div key={trade.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: trade.side === 'BUY' ? '#34d399' : '#f87171'
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', color: '#e2e8f0' }}>{trade.symbol}</p>
                    <p style={{ fontSize: '11px', color: '#64748b' }}>{trade.agent}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace' }}>${trade.price}</p>
                    <p style={{ fontSize: '11px', color: '#64748b' }}>{new Date(trade.executedAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
