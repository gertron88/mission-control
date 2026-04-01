'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusCards from '@/components/dashboard/StatusCards';

export default function HomePage() {
  return (
    <DashboardLayout
      title="Mission Control"
      subtitle="All systems operational"
    >
      {/* Status cards */}
      <StatusCards />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        {/* Activity feed - 2 cols */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Activity Feed</h3>
          <p className="text-sm text-slate-500">Activity feed coming soon...</p>
        </div>
        {/* Agent grid - 1 col */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Agent Status</h3>
          <p className="text-sm text-slate-500">Agent status coming soon...</p>
        </div>
      </div>

      {/* Bottom metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        {/* Throughput */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Task Throughput</h3>
            <span className="text-[10px] font-mono text-slate-500">Last 24h</span>
          </div>
          <div className="flex items-end gap-1 h-12">
            {[40, 65, 48, 72, 55, 88, 62, 95, 78, 84, 70, 92].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-cyan-500/30 hover:bg-cyan-500/60 transition-all cursor-pointer"
                style={{ height: `${h}%` }}
                title={`${h} tasks`}
              ></div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-slate-500 font-mono">23 tasks/hr</span>
            <span className="text-[10px] text-emerald-400 font-mono">+18% avg</span>
          </div>
        </div>

        {/* Success rate */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Success Rate</h3>
            <span className="text-[10px] font-mono text-slate-500">7-day avg</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(71,85,105,0.4)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="87.5 100" strokeDashoffset="0" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-400 font-mono">87.5%</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Completed</span>
                <span className="text-emerald-400 font-mono">234</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Failed</span>
                <span className="text-red-400 font-mono">18</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Retried</span>
                <span className="text-amber-400 font-mono">15</span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget usage */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Budget Usage</h3>
            <span className="text-[10px] font-mono text-amber-400">Apr 2026</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'API Credits', used: 68, color: 'bg-cyan-500' },
              { label: 'Compute', used: 45, color: 'bg-purple-500' },
              { label: 'Storage', used: 22, color: 'bg-emerald-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-slate-300 font-mono">{item.used}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full relative overflow-hidden`}
                    style={{ width: `${item.used}%` }}
                  >
                    <div className="progress-bar-shimmer absolute inset-0"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/40 flex justify-between text-xs">
            <span className="text-slate-500">$21,480 spent</span>
            <span className="text-slate-400 font-semibold">of $40,000</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
