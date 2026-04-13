'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { TrendingUp, TrendingDown, DollarSign, Activity, Clock, ScanLine } from 'lucide-react';

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

interface ScannerEvent {
  id: string;
  type: string;
  agentId?: string;
  agentName?: string;
  payload: any;
  timestamp: string;
}

export default function TradingPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [scannerEvents, setScannerEvents] = useState<ScannerEvent[]>([]);
  const [sseStatus, setSseStatus] = useState<'connecting' | 'live' | 'disconnected'>('connecting');
  const [selectedEvent, setSelectedEvent] = useState<ScannerEvent | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Fetch static data once
  useEffect(() => {
    async function fetchTradingData() {
      try {
        const [positionsRes, tradesRes, scannerRes] = await Promise.all([
          fetch('/api/trading/positions'),
          fetch('/api/trading/trades'),
          fetch('/api/trading/scanner?limit=50')
        ]);
        
        if (positionsRes.ok) {
          const posData = await positionsRes.json();
          setPositions(posData);
        }
        if (tradesRes.ok) {
          const tradeData = await tradesRes.json();
          setTrades(tradeData);
        }
        if (scannerRes.ok) {
          const scannerData = await scannerRes.json();
          setScannerEvents(scannerData);
        }
      } catch (err) {
        setPositions([]);
        setTrades([]);
      }
    }
    fetchTradingData();
  }, []);

  // Live SSE feed
  useEffect(() => {
    const es = new EventSource('/api/events');
    sseRef.current = es;

    es.onopen = () => setSseStatus('live');

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'ping' || data.type === 'connected') return;
        if (
          data.type === 'SCANNER_OPPORTUNITY' ||
          data.type === 'SCANNER_MATCH' ||
          data.type === 'SCANNER_HEARTBEAT' ||
          data.type === 'SCANNER_LOG'
        ) {
          const evt: ScannerEvent = {
            id: `${data.type}-${Date.now()}`,
            type: data.type,
            agentId: data.agentId,
            agentName: data.agentName,
            payload: data.payload,
            timestamp: data.timestamp || new Date().toISOString(),
          };
          setScannerEvents((prev) => [evt, ...prev].slice(0, 100));
        }
      } catch {
        // ignore malformed
      }
    };

    es.onerror = () => {
      setSseStatus('disconnected');
      es.close();
      // Auto-reconnect after 3s
      setTimeout(() => {
        setSseStatus('connecting');
      }, 3000);
    };

    return () => {
      es.close();
    };
  }, []);

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const opportunityCount = scannerEvents.filter((e) => e.type === 'SCANNER_OPPORTUNITY').length;
  const lastHeartbeat = scannerEvents.find((e) => e.type === 'SCANNER_HEARTBEAT');
  const lastMatch = scannerEvents.find((e) => e.type === 'SCANNER_MATCH');

  function formatScannerEvent(event: ScannerEvent): { title: string; detail: string; color: string } {
    switch (event.type) {
      case 'SCANNER_OPPORTUNITY':
        return {
          title: 'Opportunity',
          detail: `${event.payload.side_a || '?'}+${event.payload.side_b || '?'} | net ${(event.payload.net_profit_pct * 100).toFixed(2)}% | ${event.payload.verified ? 'verified' : 'unverified'}`,
          color: event.payload.verified ? '#34d399' : '#fbbf24'
        };
      case 'SCANNER_MATCH':
        return {
          title: 'Match Summary',
          detail: `PM: ${event.payload.polymarket_markets || 0} | Kalshi: ${event.payload.kalshi_markets || 0} | matched: ${event.payload.matched_pairs || 0}`,
          color: '#22d3ee'
        };
      case 'SCANNER_HEARTBEAT':
        return {
          title: 'Scanner Heartbeat',
          detail: `pairs tracked: ${event.payload.matched_pairs ?? '-'}`,
          color: '#94a3b8'
        };
      case 'SCANNER_LOG':
        return {
          title: 'Scan Cycle',
          detail: `${event.payload.opportunities_found || 0} opportunities`,
          color: '#a78bfa'
        };
      default:
        return { title: event.type, detail: 'Scanner event', color: '#94a3b8' };
    }
  }

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
          { label: 'Win Rate', value: `${0}%`, color: '#a78bfa', icon: TrendingDown },
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

      {/* Scanner Status Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'rgba(30, 41, 59, 0.3)',
          border: '1px solid rgba(71, 85, 105, 0.3)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <ScanLine className="w-5 h-5" style={{ color: sseStatus === 'live' ? '#34d399' : sseStatus === 'connecting' ? '#fbbf24' : '#f87171' }} />
          <div>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>Scanner Status</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
              {sseStatus === 'live' ? 'Live Feed' : sseStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </p>
          </div>
        </div>
        <div style={{
          background: 'rgba(30, 41, 59, 0.3)',
          border: '1px solid rgba(71, 85, 105, 0.3)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Activity className="w-5 h-5" style={{ color: '#fbbf24' }} />
          <div>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>Opportunities</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{opportunityCount}</p>
          </div>
        </div>
        <div style={{
          background: 'rgba(30, 41, 59, 0.3)',
          border: '1px solid rgba(71, 85, 105, 0.3)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <TrendingUp className="w-5 h-5" style={{ color: '#34d399' }} />
          <div>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>Matched Pairs</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
              {lastMatch?.payload?.matched_pairs ?? '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Positions & Recent Trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
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

      {/* Scanner Log */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(71, 85, 105, 0.4)',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Scanner Log {sseStatus === 'live' && <span style={{ color: '#34d399', fontSize: '10px', marginLeft: 8 }}>● LIVE</span>}
        </h3>
        {scannerEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <ScanLine className="w-8 h-8" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No scanner events yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scannerEvents.slice(0, 50).map((event) => {
              const fmt = formatScannerEvent(event);
              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${fmt.color}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: fmt.color
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: '#e2e8f0' }}>{fmt.title}</p>
                    <p style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmt.detail}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scanner Event Detail Modal */}
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(71, 85, 105, 0.5)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: formatScannerEvent(selectedEvent).color
              }} />
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                {formatScannerEvent(selectedEvent).title}
              </h2>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                {new Date(selectedEvent.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div style={{
              background: '#0f172a',
              borderRadius: '10px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#94a3b8',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {JSON.stringify(selectedEvent.payload, null, 2)}
            </div>

            {selectedEvent.agentName && (
              <p style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
                Agent: <span style={{ color: '#e2e8f0' }}>{selectedEvent.agentName}</span>
              </p>
            )}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
