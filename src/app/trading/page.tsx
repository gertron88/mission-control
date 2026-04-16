'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { TrendingUp, TrendingDown, DollarSign, Activity, Clock, ScanLine, ExternalLink, ShieldCheck } from 'lucide-react';

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
  game_time?: string; // ISO timestamp if available
}

// Parse game time from Kalshi ticker format: KX{LEAGUE}GAME-26APR14MIACHA-MIA
function parseGameTimeFromTicker(ticker: string): Date | null {
  // Match pattern: 26APR14 or 26APR141800 (date + optional time)
  const match = ticker.match(/26([A-Z]{3})(\d{2})(\d{4})?/);
  if (!match) return null;
  
  const monthMap: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
  };
  
  const month = monthMap[match[1]];
  const day = parseInt(match[2], 10);
  const timeStr = match[3]; // e.g., "1840" for 6:40 PM
  
  if (month === undefined || isNaN(day)) return null;
  
  const year = 2026;
  let hours = 19; // Default 7 PM ET for games
  let minutes = 0;
  
  if (timeStr && timeStr.length === 4) {
    hours = parseInt(timeStr.substring(0, 2), 10);
    minutes = parseInt(timeStr.substring(2, 4), 10);
  }
  
  // Create date in ET (America/New_York)
  const date = new Date(Date.UTC(year, month, day, hours + 4, minutes)); // +4 for ET to UTC
  return date;
}

// Check if a game is currently live (within 4 hours of start time, or if we have price activity)
function isGameLive(pair: MatchedPair, livePrices: Map<string, LivePriceData>): boolean {
  const key = `${pair.polymarket_id}::${pair.kalshi_ticker}`;
  const price = livePrices.get(key);
  
  // If we have actual price updates, game is definitely active
  if (price?.polymarket_yes !== null || price?.kalshi_yes !== null) {
    return true;
  }
  
  // Check if game time is within next 4 hours or last 3 hours (typical game window)
  const gameTime = parseGameTimeFromTicker(pair.kalshi_ticker);
  if (!gameTime) return false;
  
  const now = new Date();
  const hoursUntilGame = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Game is "live" if it starts within 2 hours or started within last 3 hours
  return hoursUntilGame <= 2 && hoursUntilGame >= -3;
}

// Get game status text
function getGameStatus(pair: MatchedPair, livePrices: Map<string, LivePriceData>): { text: string; color: string; isLive: boolean } {
  const key = `${pair.polymarket_id}::${pair.kalshi_ticker}`;
  const price = livePrices.get(key);
  const gameTime = parseGameTimeFromTicker(pair.kalshi_ticker);
  
  // Has price activity = actively trading
  if (price?.polymarket_yes !== null || price?.kalshi_yes !== null) {
    return { text: '🔴 LIVE', color: '#ef4444', isLive: true };
  }
  
  if (!gameTime) {
    return { text: 'Upcoming', color: '#94a3b8', isLive: false };
  }
  
  const now = new Date();
  const hoursUntil = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntil < 0) {
    return { text: 'In Progress', color: '#ef4444', isLive: true };
  }
  if (hoursUntil <= 1) {
    return { text: 'Starting Soon', color: '#fbbf24', isLive: true };
  }
  if (hoursUntil <= 4) {
    return { text: 'Today', color: '#22d3ee', isLive: true };
  }
  
  // Format date
  const days = Math.floor(hoursUntil / 24);
  if (days === 0) return { text: 'Tomorrow', color: '#94a3b8', isLive: false };
  if (days === 1) return { text: 'In 2 days', color: '#94a3b8', isLive: false };
  return { text: `In ${days} days`, color: '#94a3b8', isLive: false };
}

export default function TradingPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [scannerEvents, setScannerEvents] = useState<ScannerEvent[]>([]);
  const [pairs, setPairs] = useState<MatchedPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<MatchedPair | null>(null);
  const [livePrices, setLivePrices] = useState<Map<string, LivePriceData>>(new Map());
  const [sseStatus, setSseStatus] = useState<'connecting' | 'live' | 'disconnected'>('connecting');
  const sseRef = useRef<EventSource | null>(null);

  // Fetch static data once
  useEffect(() => {
    async function fetchTradingData() {
      try {
        const [positionsRes, tradesRes, scannerRes] = await Promise.all([
          fetch('/api/trading/positions'),
          fetch('/api/trading/trades'),
          fetch('/api/trading/scanner?limit=100')
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
          const scannerData: ScannerEvent[] = await scannerRes.json();
          setScannerEvents(scannerData);
          // Hydrate live prices from historical LIVE_PRICES events
          const priceEvents = scannerData.filter((e) => e.type === 'LIVE_PRICES');
          const pricesMap = new Map<string, LivePriceData>();
          // Process in reverse order (oldest first) so latest overwrites
          priceEvents.reverse().forEach((e) => {
            const payload = e.payload as LivePriceData;
            if (payload?.pair_key) {
              pricesMap.set(payload.pair_key, payload);
            }
          });
          setLivePrices(pricesMap);
        }
        
        // Fetch pairs separately (they're less frequent than LIVE_PRICES)
        const pairsRes = await fetch('/api/trading/scanner?limit=5&type=SCANNER_PAIRS');
        if (pairsRes.ok) {
          const pairsData: ScannerEvent[] = await pairsRes.json();
          if (pairsData.length > 0) {
            const latest = pairsData.sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )[0];
            setPairs(latest.payload?.pairs || []);
          }
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
          data.type === 'SCANNER_LOG' ||
          data.type === 'SCANNER_PAIRS' ||
          data.type === 'LIVE_PRICES'
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
          if (data.type === 'SCANNER_PAIRS' && Array.isArray(data.payload?.pairs)) {
            setPairs(data.payload.pairs);
          }
          // Handle LIVE_PRICES updates
          if (data.type === 'LIVE_PRICES' && data.payload?.pair_key) {
            setLivePrices((prev) => {
              const next = new Map(prev);
              next.set(data.payload.pair_key, data.payload as LivePriceData);
              return next;
            });
          }
        }
      } catch {
        // ignore malformed
      }
    };

    es.onerror = () => {
      setSseStatus('disconnected');
      es.close();
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
      case 'SCANNER_PAIRS':
        return {
          title: 'Pairs Update',
          detail: `${event.payload.pairs?.length || 0} pairs refreshed`,
          color: '#2dd4bf'
        };
      case 'LIVE_PRICES':
        return {
          title: 'Live Prices',
          detail: `${event.payload.game_title?.substring(0, 30) || 'Unknown'} | PM: ${event.payload.polymarket_yes ? (event.payload.polymarket_yes * 100).toFixed(1) : '-'}¢ KS: ${event.payload.kalshi_yes ? (event.payload.kalshi_yes * 100).toFixed(1) : '-'}¢`,
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
      {/* Responsive Styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .stats-grid > div {
            padding: 12px !important;
          }
          .stats-grid .stat-value {
            font-size: 18px !important;
          }
          .status-bar {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .status-bar > div {
            padding: 12px !important;
          }
          .pairs-table th,
          .pairs-table td {
            padding: 8px 6px !important;
            font-size: 11px !important;
          }
          .pairs-table th:nth-child(3),
          .pairs-table th:nth-child(4),
          .pairs-table th:nth-child(5),
          .pairs-table td:nth-child(3),
          .pairs-table td:nth-child(4),
          .pairs-table td:nth-child(5) {
            display: none !important;
          }
          .positions-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .pairs-grid {
            grid-template-columns: 1fr !important;
          }
          .modal-content {
            max-width: 95vw !important;
            padding: 16px !important;
          }
        }
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .pairs-table th:nth-child(6),
          .pairs-table td:nth-child(6) {
            display: none !important;
          }
        }
      `}</style>

      {/* Stats Row */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
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
            <div className="stat-value" style={{ fontSize: '24px', fontWeight: 700, color: stat.color, fontFamily: 'monospace' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Scanner Status Bar */}
      <div className="status-bar" style={{
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
              {lastMatch?.payload?.matched_pairs ?? pairs.length}
            </p>
          </div>
        </div>
      </div>

      {/* Sports Trading Dashboard - Live Prices */}
      {pairs.length > 0 && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
            Sports Trading Live {sseStatus === 'live' && <span style={{ color: '#34d399', fontSize: '10px', marginLeft: 8 }}>● LIVE</span>}
            {sseStatus !== 'live' && <span style={{ color: '#fbbf24', fontSize: '10px', marginLeft: 8 }}>○ {sseStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}</span>}
          </h3>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span>{pairs.length} pairs tracked • 🔴 Live games shown first</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              💡 Spread = PM - KS | Positive = PM higher | Negative = KS higher
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="pairs-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(71, 85, 105, 0.3)' }}>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>Game</th>
                  <th style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>PM YES</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>KS YES</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>Spread</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>Arb %</th>
                  <th style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontWeight: 600 }}>Trade</th>
                </tr>
              </thead>
              <tbody>
                {[...pairs]
                  .sort((a, b) => {
                    const aStatus = getGameStatus(a, livePrices);
                    const bStatus = getGameStatus(b, livePrices);
                    // Live games first, then by confidence
                    if (aStatus.isLive && !bStatus.isLive) return -1;
                    if (!aStatus.isLive && bStatus.isLive) return 1;
                    return (b.confidence || 0) - (a.confidence || 0);
                  })
                  .map((pair) => {
                  const key = `${pair.polymarket_id}::${pair.kalshi_ticker}`;
                  const price = livePrices.get(key);
                  const hasArb = price?.arbitrage_pct && price.arbitrage_pct >= 0.035;
                  const status = getGameStatus(pair, livePrices);
                  const gameTime = parseGameTimeFromTicker(pair.kalshi_ticker);
                  return (
                    <tr key={key} style={{ 
                      borderBottom: '1px solid rgba(71, 85, 105, 0.2)',
                      background: status.isLive ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                    }}>
                      <td style={{ padding: '10px', color: '#e2e8f0' }}>
                        <div>{pair.polymarket_question || key}</div>
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
                      <td style={{ textAlign: 'right', padding: '10px', color: '#22d3ee', fontFamily: 'monospace' }}>
                        {price?.polymarket_yes ? `${(price.polymarket_yes * 100).toFixed(1)}¢` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px', color: '#f472b6', fontFamily: 'monospace' }}>
                        {price?.kalshi_yes ? `${(price.kalshi_yes * 100).toFixed(1)}¢` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px', color: price?.spread && Math.abs(price.spread) > 0.02 ? '#fbbf24' : '#94a3b8', fontFamily: 'monospace' }}>
                        {price?.spread ? `${(price.spread * 100).toFixed(1)}¢` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px', color: hasArb ? '#34d399' : '#64748b', fontFamily: 'monospace', fontWeight: hasArb ? 700 : 400 }}>
                        {price?.arbitrage_pct ? `${(price.arbitrage_pct * 100).toFixed(2)}%` : '-'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px' }}>
                        {hasArb ? (
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', fontWeight: 600 }}>🎯 OPPORTUNITY</span>
                        ) : (
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>Watching</span>
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
      <div className="positions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
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

      {/* Matched Pairs */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(71, 85, 105, 0.4)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Matched Pairs {sseStatus === 'live' && <span style={{ color: '#34d399', fontSize: '10px', marginLeft: 8 }}>● LIVE</span>}
        </h3>
        {pairs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <ScanLine className="w-8 h-8" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No matched pairs yet</p>
          </div>
        ) : (
          <div className="pairs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {pairs.map((pair, idx) => (
              <div
                key={`${pair.polymarket_id}-${pair.kalshi_ticker}-${idx}`}
                onClick={() => setSelectedPair(pair)}
                style={{
                  padding: '14px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '10px',
                  border: '1px solid rgba(71, 85, 105, 0.3)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.7)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.5)')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {pair.polymarket_question || pair.kalshi_title}
                  </p>
                  {pair.verified && (
                    <ShieldCheck className="w-4 h-4" style={{ color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '10px',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    background: 'rgba(34, 211, 238, 0.15)',
                    color: '#22d3ee',
                    fontWeight: 600,
                  }}>
                    {Math.round((pair.confidence || 0) * 100)}% match
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                    {pair.kalshi_ticker}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scanner Log (compact) */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(71, 85, 105, 0.4)',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
          Scanner Log
        </h3>
        {scannerEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
            <p>No scanner events yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scannerEvents.slice(0, 20).map((event) => {
              const fmt = formatScannerEvent(event);
              return (
                <div
                  key={event.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${fmt.color}`,
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: fmt.color }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: '#e2e8f0' }}>{fmt.title}</p>
                    <p style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmt.detail}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pair Detail Modal */}
      {selectedPair && (
        <div
          onClick={() => setSelectedPair(null)}
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
            className="modal-content"
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: selectedPair.verified ? '#34d399' : '#22d3ee'
              }} />
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                Matched Pair
              </h2>
              {selectedPair.verified && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '10px',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: 'rgba(52, 211, 153, 0.15)',
                  color: '#34d399',
                  fontWeight: 600,
                }}>Verified</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#0f172a', borderRadius: '10px', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>Polymarket</p>
                <p style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.4, marginBottom: '10px' }}>{selectedPair.polymarket_question}</p>
                <a
                  href={selectedPair.polymarket_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#38bdf8',
                    textDecoration: 'none',
                  }}
                >
                  Open on Polymarket <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div style={{ background: '#0f172a', borderRadius: '10px', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>Kalshi</p>
                <p style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.4, marginBottom: '10px' }}>{selectedPair.kalshi_title}</p>
                <a
                  href={selectedPair.kalshi_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#38bdf8',
                    textDecoration: 'none',
                  }}
                >
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
              <button
                onClick={() => setSelectedPair(null)}
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
