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

      {/* Placeholder for more content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Activity Feed</h3>
          <p className="text-sm text-slate-500">Activity feed coming soon...</p>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Agent Status</h3>
          <p className="text-sm text-slate-500">Agent status coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
