export const dynamic = 'force-dynamic'

import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatusCard } from "@/components/status/StatusCard";
import { SectionCard } from "@/components/layout/SectionCard";
import { DataTable } from "@/components/data/DataTable";
import { AlertBanner } from "@/components/status/AlertBanner";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  Activity,
  Target
} from "lucide-react";

// Mock data - replace with real API calls
const mockPositions = [
  { id: 1, symbol: "BTC/USDT", side: "LONG", size: 0.5, entry: 43250, pnl: 1250, pnlPercent: 5.8 },
  { id: 2, symbol: "ETH/USDT", side: "SHORT", size: 5, entry: 2650, pnl: -320, pnlPercent: -2.4 },
  { id: 3, symbol: "SOL/USDT", side: "LONG", size: 100, entry: 98.5, pnl: 450, pnlPercent: 4.6 },
];

const mockOrders = [
  { id: 1, symbol: "BTC/USDT", type: "LIMIT", side: "BUY", price: 42500, status: "OPEN", time: "2 min ago" },
  { id: 2, symbol: "ETH/USDT", type: "MARKET", side: "SELL", price: 2680, status: "FILLED", time: "5 min ago" },
  { id: 3, symbol: "BTC/USDT", type: "STOP", side: "SELL", price: 41000, status: "OPEN", time: "12 min ago" },
];

export default function TradingPage() {
  const totalPnl = mockPositions.reduce((sum, p) => sum + p.pnl, 0);
  const openPositions = mockPositions.length;
  const totalExposure = mockPositions.reduce((sum, p) => sum + (p.entry * p.size), 0);

  return (
    <DashboardShell
      title="Trading Command Center"
      subtitle="Live trading operations and P&L"
    >
      {/* Kill Switch Alert */}
      <AlertBanner
        type="info"
        title="Emergency Controls"
        message="Kill switch will immediately close all positions and halt trading."
        action={{ 
          label: "Kill Switch", 
          onClick: () => console.log("Kill switch triggered"),
          variant: "destructive"
        }}
      />

      {/* P&L Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatusCard
          title="Total P&L"
          value={`$${totalPnl.toLocaleString()}`}
          icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          trend={{ value: 12.5, direction: totalPnl >= 0 ? "up" : "down" }}
          status={totalPnl >= 0 ? "healthy" : "critical"}
        />
        <StatusCard
          title="Open Positions"
          value={openPositions}
          icon={Target}
          status="healthy"
        />
        <StatusCard
          title="Total Exposure"
          value={`$${(totalExposure / 1000).toFixed(1)}k`}
          icon={DollarSign}
          status={totalExposure > 50000 ? "warning" : "healthy"}
        />
        <StatusCard
          title="Day's Volume"
          value="$124.5k"
          icon={Activity}
          trend={{ value: 8.3, direction: "up" }}
          status="healthy"
        />
      </div>

      {/* Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Max Drawdown", value: "3.2%", limit: "5%", status: "healthy" },
          { label: "Daily Loss", value: "$450", limit: "$2,000", status: "healthy" },
          { label: "Leverage", value: "2.1x", limit: "3x", status: "healthy" },
        ].map((metric) => (
          <div key={metric.label} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-2xl font-bold">{metric.value}</span>
              <span className="text-xs text-slate-400">Limit: {metric.limit}</span>
            </div>
            <div className="mt-2 h-2 bg-slate-200 rounded-full">
              <div 
                className={`h-full rounded-full ${
                  metric.status === "healthy" ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: "40%" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Positions */}
        <SectionCard 
          title="Open Positions" 
          action={{ label: "View All", href: "#" }}
        >
          <DataTable
            data={mockPositions}
            columns={[
              { key: "symbol", header: "Symbol" },
              { 
                key: "side", 
                header: "Side",
                render: (v) => (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    v === "LONG" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}>
                    {v}
                  </span>
                )
              },
              { key: "size", header: "Size" },
              { key: "entry", header: "Entry", render: (v) => `$${v.toLocaleString()}` },
              { 
                key: "pnl", 
                header: "P&L",
                render: (v) => (
                  <span className={v >= 0 ? "text-emerald-600" : "text-rose-600"}>
                    {v >= 0 ? "+" : ""}${v.toLocaleString()}
                  </span>
                )
              },
              { 
                key: "pnlPercent", 
                header: "%",
                render: (v) => (
                  <span className={v >= 0 ? "text-emerald-600" : "text-rose-600"}>
                    {v >= 0 ? "+" : ""}{v}%
                  </span>
                )
              },
            ]}
          />
        </SectionCard>

        {/* Recent Orders */}
        <SectionCard 
          title="Recent Orders"
          action={{ label: "History", href: "#" }}
        >
          <DataTable
            data={mockOrders}
            columns={[
              { key: "symbol", header: "Symbol" },
              { key: "type", header: "Type" },
              { 
                key: "side", 
                header: "Side",
                render: (v) => (
                  <span className={v === "BUY" ? "text-emerald-600" : "text-rose-600"}>
                    {v}
                  </span>
                )
              },
              { key: "price", header: "Price", render: (v) => `$${v.toLocaleString()}` },
              { 
                key: "status", 
                header: "Status",
                render: (v) => (
                  <span className={`px-2 py-1 rounded text-xs ${
                    v === "FILLED" ? "bg-emerald-100 text-emerald-700" :
                    v === "OPEN" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {v}
                  </span>
                )
              },
              { key: "time", header: "Time" },
            ]}
          />
        </SectionCard>

        {/* Strategy Performance */}
        <SectionCard title="Strategy Performance">
          <div className="space-y-4">
            {[
              { name: "Mean Reversion", winRate: 68, profit: 3250, trades: 45 },
              { name: "Momentum", winRate: 72, profit: 1890, trades: 32 },
              { name: "Arbitrage", winRate: 85, profit: 950, trades: 18 },
            ].map((strategy) => (
              <div key={strategy.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="font-medium">{strategy.name}</p>
                  <p className="text-sm text-slate-500">{strategy.trades} trades · {strategy.winRate}% win rate</p>
                </div>
                <span className="text-emerald-600 font-medium">+${strategy.profit}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Trading Agents */}
        <SectionCard title="Trading Agents">
          <div className="space-y-3">
            {[
              { handle: "@claw-trader", status: "active", todayPnl: 1250, positions: 2 },
              { handle: "@claw-analyst", status: "idle", todayPnl: 0, positions: 0 },
            ].map((agent) => (
              <div key={agent.handle} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  <span className="font-medium">{agent.handle}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{agent.positions} positions</p>
                  <p className="text-xs text-emerald-600">+${agent.todayPnl}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
