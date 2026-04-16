'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { TrendingUp, TrendingDown, DollarSign, Activity, Clock, ScanLine, ExternalLink, ShieldCheck, Wifi, WifiOff, RefreshCw } from 'lucide-react';

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

interface LivePriceData {
  pair_key: string;
  game_title: string;
  polymarket_yes: number | null;
  kalshi_yes: number | null;
  spread: number | null;
  arbitrage_pct: number | null;
  timestamp: string;
}

interface MatchedPair {
  polymarket_id: string;
  polymarket_question: string;
  polymarket_url: string;
  kalshi_ticker: string;
  kalshi_title: string;
  kalshi_url: string;
  confidence: number;
  verified: boolean;
  match_reason?: string;
  game_time?: string;
}

// Parse game time from Kalshi ticker format
function parseGameTimeFromTicker(ticker: string): Date | null {
  const match = ticker.match(/26([A-Z]{3})(\d{2})(\d{4})?/);
  if (!match) return null;
  
  const monthMap: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
  };
  
  const month = monthMap[match[1]];
  const day = parseInt(match[2], 10);
  const timeStr = match[3];
  
  if (month === undefined || isNaN(day)) return null;
  
  const year = 2026;
  let hours = 19;
  let minutes = 0;
  
  if (timeStr && timeStr.length === 4) {
    hours = parseInt(timeStr.substring(0, 2), 10);
    minutes = parseInt(timeStr.substring(2, 4), 10);
  }
  
  return new Date(Date.UTC(year, month, day, hours + 4, minutes));
}

// Check if a game is currently live
function isGameLive(pair: MatchedPair, livePrices: Map<string, LivePriceData>): boolean {
  const key = `${pair.polymarket_id}::${pair.kalshi_ticker}`;
  const price = livePrices.get(key);
  
  if (price?.polymarket_yes !== null || price?.kalshi_yes !== null) {
    return true;
  }
  
  const gameTime = parseGameTimeFromTicker(pair.kalshi_ticker);
  if (!gameTime) return false;
  
  const now = new Date();
  const hoursUntil = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil >= -3 && hoursUntil <= 4;
}

function getGameStatus(pair: MatchedPair, livePrices: Map<string, LivePriceData>) {
  const key = `${pair.polymarket_id}::${pair.kalshi_ticker}`;
  const price = livePrices.get(key);
  const gameTime = parseGameTimeFromTicker(pair.kalshi_ticker);
  
  if (price?.polymarket_yes !== null || price?.kalshi_yes !== null) {
    return { isLive: true, text: '🔴 LIVE', color: '#ef4444' };
  }
  
  if (!gameTime) return { isLive: false, text: 'Unknown', color: '#64748b' };
  
  const now = new Date();
  const hoursUntil = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntil < -3) return { isLive: false, text: 'Finished', color: '#64748b' };
  if (hoursUntil < 0) return { isLive: true, text: '🔴 LIVE', color: '#ef4444' };
  if (hoursUntil < 1) return { isLive: false, text: 'Starting Soon', color: '#fbbf24' };
  
  return { isLive: false, text: `In ${Math.floor(hoursUntil)}h`, color: '#94a3b8' };
}

// Custom hook for SSE with auto-reconnect
function useSSE<T>() {
  const [data, setData] = useState<T[]>([]);
  const [status, setStatus] = useState<'connecting' | 'live' | 'disconnected'>('connecting');
  const [lastMessageAt, setLastMessageAt] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    if (esRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    setStatus('connecting');
    
    try {
      const es = new EventSource('/api/events');
      esRef.current = es;

      es.onopen = () => {
        setStatus('live');
        reconnectAttemptsRef.current = 0;
      };

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type === 'ping' || parsed.type === 'connected') {
            setLastMessageAt(new Date());
            return;
          }
          
          setLastMessageAt(new Date());
          
          const evt: ScannerEvent = {
            id: `${parsed.type}-${Date.now()}`,
            type: parsed.type,
            agentId: parsed.agentId,
            agentName: parsed.agentName,
            payload: parsed.payload,
            timestamp: parsed.timestamp || new Date().toISOString(),
          };
          
          setData((prev) => [evt, ...prev].slice(0, 200));
        } catch {
          // ignore malformed
        }
      };

      es.onerror = () => {
        setStatus('disconnected');
        es.close();
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (err) {
      setStatus('disconnected');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    esRef.current?.close();
    esRef.current = null;
    setStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    
    // Heartbeat check - if no message in 30s, reconnect
    const heartbeatInterval = setInterval(() => {
      if (lastMessageAt && status === 'live') {
        const secondsSinceLastMessage = (Date.now() - lastMessageAt.getTime()) / 1000;
        if (secondsSinceLastMessage > 30) {
          reconnect();
        }
      }
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      disconnect();
    };
  }, [connect, disconnect, reconnect, lastMessageAt, status]);

  return { data, status, lastMessageAt, reconnect };
}

export default function TradingPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pairs, setPairs] = useState<MatchedPair[]>([]);
  const [livePrices, setLivePrices] = useState<Map<string, LivePriceData>>(new Map());
  const [selectedPair, setSelectedPair] = useState<MatchedPair | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  // SSE hook for real-time updates
  const { data: sseEvents, status: sseStatus, lastMessageAt, reconnect } = useSSE<ScannerEvent>();

  // Initial data fetch
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [positionsRes, tradesRes, scannerRes, pairsRes] = await Promise.all([
          fetch('/api/trading/positions'),
          fetch('/api/trading/trades'),
          fetch('/api/trading/scanner?limit=50&type=LIVE_PRICES'),
          fetch('/api/trading/scanner?limit=3&type=SCANNER_PAIRS')
        ]);

        if (positionsRes.ok) setPositions(await positionsRes.json());
        if (tradesRes.ok) setTrades(await tradesRes.json());
        
        if (scannerRes.ok) {
          const priceEvents: ScannerEvent[] = await scannerRes.json();
          const pricesMap = new Map<string, LivePriceData>();
          priceEvents.reverse().forEach((e) => {
            const payload = e.payload as LivePriceData;
            if (payload?.pair_key) pricesMap.set(payload.pair_key, payload);
          });
          setLivePrices(pricesMap);
        }
        
        if (pairsRes.ok) {
          const pairsData: ScannerEvent[] = await pairsRes.json();
          if (pairsData.length > 0) {
            const latest = pairsData.sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )[0];
            setPairs(latest.payload?.pairs || []);
          }
        }
        
        setLastFetchTime(new Date());
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    }
    fetchInitialData();
  }, []);

  // Process SSE events
  useEffect(() => {
    if (sseEvents.length === 0) return;

    sseEvents.forEach((evt) => {
      if (evt.type === 'SCANNER_PAIRS' && Array.isArray(evt.payload?.pairs)) {
        setPairs(evt.payload.pairs);
      }
      
      if (evt.type === 'LIVE_PRICES' && evt.payload?.pair_key) {
        const payload = evt.payload as LivePriceData;
        setLivePrices((prev) => {
          const next = new Map(prev);
          next.set(payload.pair_key, payload);
          return next;
        });
      }
    });
  }, [sseEvents]);

  // Periodic API refresh as fallback (every 30s)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/trading/scanner?limit=20&type=LIVE_PRICES');
        if (res.ok) {
          const events: ScannerEvent[] = await res.json();
          const pricesMap = new Map(livePrices);
          events.reverse().forEach((e) => {
            const payload = e.payload as LivePriceData;
            if (payload?.pair_key) pricesMap.set(payload.pair_key, payload);
          });
          setLivePrices(pricesMap);
          setLastFetchTime(new Date());
        }
      } catch (err) {
        console.error('Periodic refresh failed:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [livePrices]);

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const opportunityCount = sseEvents.filter((e) => e.type === 'SCANNER_OPPORTUNITY').length;
  const lastMatch = sseEvents.find((e) => e.type === 'SCANNER_MATCH') || 
                    (pairs.length > 0 ? { payload: { matched_pairs: pairs.length } } : null);

  // Calculate connection health
  const secondsSinceLastMessage = lastMessageAt ? (Date.now() - lastMessageAt.getTime()) / 1000 : null;
  const isStale = secondsSinceLastMessage !== null && secondsSinceLastMessage > 30;

  function formatScannerEvent(event: ScannerEvent) {
    switch (event.type) {
      case 'SCANNER_OPPORTUNITY':
        return {
          title: '🎯 Opportunity',
          detail: `${event.payload.side_a || '?'}+${event.payload.side_b || '?'} | net ${(event.payload.net_profit_pct * 100).toFixed(2)}%`,
          color: event.payload.verified ? '#34d399' : '#fbbf24'
        };
      case 'SCANNER_MATCH':
        return {
          title: '📊 Match Summary',
          detail: `PM: ${event.payload.polymarket_markets || 0} | Kalshi: ${event.payload.kalshi_markets || 0} | matched: ${event.payload.matched_pairs || 0}`,
          color: '#22d3ee'
        };
      case 'SCANNER_HEARTBEAT':
        return {
          title: '💓 Heartbeat',
          detail: `pairs tracked: ${event.payload.matched_pairs ?? '-'}`,
          color: '#94a3b8'
        };
      case 'SCANNER_LOG':
        return {
          title: '🔄 Scan Cycle',
          detail: `${event.payload.opportunities_found || 0} opportunities`,
          color: '#a78bfa'
        };
      case 'SCANNER_PAIRS':
        return {
          title: '📋 Pairs Update',
          detail: `${event.payload.pairs?.length || 0} pairs refreshed`,
          color: '#2dd4bf'
        };
      case 'LIVE_PRICES':
        return {
          title: '💰 Price Update',
          detail: `${event.payload.game_title?.substring(0, 25) || 'Unknown'}`,
          color: '#818cf8'
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
      {/* Connection Status Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        background: sseStatus === 'live' && !isStale ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 191, 36, 0.1)',
        border: `1px solid ${sseStatus === 'live' && !isStale ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
        borderRadius: '8px',
      }}>
        {sseStatus === 'live' && !isStale ? (
          <Wifi className="w-4 h-4" style={{ color: '#34d399' }} />
        ) : sseStatus === 'connecting' ? (
          <RefreshCw className="w-4 h-4" style={{ color: '#fbbf24', animation: 'spin 1s linear infinite' }} />
        ) : (
          <WifiOff className="w-4 h-4" style={{ color: '#f87171' }} />
        )}
        
        <div style={{ flex: 1 }}>
          <span style={{ 
            fontSize: '13px', 
            fontWeight: 600,
            color: sseStatus === 'live' && !isStale ? '#34d399' : sseStatus === 'connecting' ? '#fbbf24' : '#f87171'
          }}>
            {sseStatus === 'live' && !isStale ? 'Live Feed Connected' : 
             sseStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
            {lastMessageAt ? `Last update: ${Math.round((Date.now() - lastMessageAt.getTime()) / 1000)}s ago` : 'Waiting for data...'}
          </span>
        </div>
        
        {(isStale || sseStatus === 'disconnected') && (
          <button
            onClick={reconnect}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid rgba(71, 85, 105, 0.5)',
              background: 'rgba(30, 41, 59, 0.5)',
              color: '#e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw className="w-3 h-3" /> Reconnect
          </button>
        )}
      </div>

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

      {/* Live Sports Trading Table */}
      {pairs.length > 0 && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live Sports Trading
              {sseStatus === 'live' && !isStale && (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '8px',
                  fontSize: '10px', 
                  color: '#34d399',
                  padding: '2px 8px',
                  background: 'rgba(52, 211, 153, 0.15)',
                  borderRadius: '999px',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
                  LIVE
                </span>
              )}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {lastFetchTime && `API: ${Math.round((Date.now() - lastFetchTime.getTime()) / 1000)}s ago`}
            </span>
          </div>
          
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
            💡 Spread = PM YES - KS YES | Positive = PM higher | Negative = KS higher
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(71, 85, 105, 0.3)' }}>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>Game</th>
                  <th style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>PM YES</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>KS YES</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>Spread</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>Arb %</th>
                  <th style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {[...pairs]
                  .sort((a, b) => {
                    const aStatus = getGameStatus(a, livePrices);
                    const bStatus = getGameStatus(b, livePrices);
                    if (aStatus.isLive && !bStatus.isLive) return -1;
                    if (!aStatus.isLive && bStatus.isLive) return 1;
                    return (b.confidence || 0) - (a.confidence || 0);
                  })
                  .map((pair) => {
                  const key = `${pair.polymarket_id}::${pair.kalshi_ticker}`;
                  const price = livePrices.get(key);
                  const hasArb = price?.arbitrage_pct && price.arbitrage_pct >= 0.03;
                  const status = getGameStatus(pair, livePrices);
                  const gameTime = parseGameTimeFromTicker(pair.kalshi_ticker);
                  
                  return (
                    <tr key={key} style={{ 
                      borderBottom: '1px solid rgba(71, 85, 105, 0.2)',
                      background: status.isLive ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                    }}>
                      <td style={{ padding: '10px', color: '#e2e8f0' }}>
                        <div style={{ fontWeight: 500 }}>{pair.polymarket_question || key}</div>
                        {gameTime && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            {gameTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {gameTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px' }}>
                        <span style={{ 
                          fontSize: '10px', 
                          padding: '3px 8px', 
                          borderRadius: '999px', 
                          background: status.isLive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.15)', 
                          color: status.color,
                          fontWeight: 600 
                        }}>
                          {status.text}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px', color: '#22d3ee', fontFamily: 'monospace', fontWeight: 600 }}>
                        {price?.polymarket_yes ? `${(price.polymarket_yes * 100).toFixed(1)}¢` : <span style={{ color: '#64748b' }}>-</span>}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px', color: '#f472b6', fontFamily: 'monospace', fontWeight: 600 }}>
                        {price?.kalshi_yes ? `${(price.kalshi_yes * 100).toFixed(1)}¢` : <span style={{ color: '#64748b' }}>-</span>}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px', fontFamily: 'monospace', fontWeight: 600,
                        color: price?.spread ? (price.spread > 0.02 ? '#fbbf24' : price.spread < -0.02 ? '#fbbf24' : '#94a3b8') : '#64748b'
                      }}>
                        {price?.spread ? `${(price.spread * 100) > 0 ? '+' : ''}${(price.spread * 100).toFixed(1)}¢` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px', color: hasArb ? '#34d399' : '#64748b', fontFamily: 'monospace', fontWeight: hasArb ? 700 : 400 }}>
                        {price?.arbitrage_pct ? `${(price.arbitrage_pct * 100).toFixed(2)}%` : '-'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px' }}>
                        {hasArb ? (
                          <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', fontWeight: 700 }}>🎯 TRADE</span>
                        ) : (
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>Watch</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Positions & Recent Trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Open Positions */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(71, 85, 105, 0.4)', borderRadius: '12px', padding: '20px' }}>
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
                <div key={pos.id} style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', borderLeft: `3px solid ${pos.pnl >= 0 ? '#34d399' : '#f87171'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{pos.symbol}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: pos.side === 'LONG' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: pos.side === 'LONG' ? '#34d399' : '#f87171' }}>{pos.side}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Size: {pos.size}</span>
                    <span style={{ color: pos.pnl >= 0 ? '#34d399' : '#f87171', fontFamily: 'monospace' }}>{pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)} ({pos.pnlPercent.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(71, 85, 105, 0.4)', borderRadius: '12px', padding: '20px' }}>
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
                <div key={trade.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: trade.side === 'BUY' ? '#34d399' : '#f87171' }} />
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

      {/* Matched Pairs */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(71, 85, 105, 0.4)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Matched Pairs ({pairs.length})
        </h3>
        {pairs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <ScanLine className="w-8 h-8" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No matched pairs yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {pairs.map((pair, idx) => (
              <div
                key={`${pair.polymarket_id}-${pair.kalshi_ticker}-${idx}`}
                onClick={() => setSelectedPair(pair)}
                style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', border: '1px solid rgba(71, 85, 105, 0.3)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.7)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.5)')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {pair.polymarket_question || pair.kalshi_title}
                  </p>
                  {pair.verified && <ShieldCheck className="w-4 h-4" style={{ color: '#34d399', flexShrink: 0, marginTop: '2px' }} />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(34, 211, 238, 0.15)', color: '#22d3ee', fontWeight: 600 }}>
                    {Math.round((pair.confidence || 0) * 100)}% match
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{pair.kalshi_ticker}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scanner Log */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(71, 85, 105, 0.4)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Scanner Log ({sseEvents.length} events)
        </h3>
        {sseEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
            <p>No scanner events yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sseEvents.slice(0, 20).map((event) => {
              const fmt = formatScannerEvent(event);
              return (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', borderLeft: `3px solid ${fmt.color}` }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: fmt.color }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: '#e2e8f0' }}>{fmt.title}</p>
                    <p style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmt.detail}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{new Date(event.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pair Detail Modal */}
      {selectedPair && (
        <div onClick={() => setSelectedPair(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#1e293b', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: selectedPair.verified ? '#34d399' : '#22d3ee' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>Matched Pair</h2>
              {selectedPair.verified && <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', fontWeight: 600 }}>Verified</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#0f172a', borderRadius: '10px', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>Polymarket</p>
                <p style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.4, marginBottom: '10px' }}>{selectedPair.polymarket_question}</p>
                <a href={selectedPair.polymarket_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#38bdf8', textDecoration: 'none' }}>
                  Open on Polymarket <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div style={{ background: '#0f172a', borderRadius: '10px', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>Kalshi</p>
                <p style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.4, marginBottom: '10px' }}>{selectedPair.kalshi_title}</p>
                <a href={selectedPair.kalshi_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#38bdf8', textDecoration: 'none' }}>
                  Open on Kalshi <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#0f172a', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>Confidence</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>{Math.round((selectedPair.confidence || 0) * 100)}%</p>
                </div>
                <div style={{ background: '#0f172a', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>Match Reason</p>
                  <p style={{ fontSize: '13px', color: '#e2e8f0' }}>{selectedPair.match_reason || 'SequenceMatcher'}</p>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedPair(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(71, 85, 105, 0.5)', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </DashboardLayout>
  );
}
