'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusCards from '@/components/dashboard/StatusCards';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import AgentStatusGrid from '@/components/dashboard/AgentStatusGrid';
import ThroughputChart from '@/components/dashboard/ThroughputChart';
import SuccessRateChart from '@/components/dashboard/SuccessRateChart';
import BudgetUsage from '@/components/dashboard/BudgetUsage';

interface Stats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  runningTasks: number;
  totalAgents: number;
  onlineAgents: number;
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    runningTasks: 0,
    totalAgents: 0,
    onlineAgents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    async function fetchStats() {
      try {
        // Fetch agents
        const agentsRes = await fetch('/api/agents');
        const agents = agentsRes.ok ? await agentsRes.json() : [];
        
        // Fetch projects
        const projectsRes = await fetch('/api/projects');
        const projects = projectsRes.ok ? await projectsRes.json() : [];
        
        // Fetch tasks
        const tasksRes = await fetch('/api/tasks');
        const tasksData = tasksRes.ok ? await tasksRes.json() : { data: [] };
        const tasks = tasksData.data || [];
        
        setStats({
          totalAgents: agents.length,
          onlineAgents: agents.filter((a: { status: string }) => a.status === 'ONLINE' || a.status === 'BUSY').length,
          totalProjects: projects.length,
          activeProjects: projects.filter((p: { state: string }) => p.state === 'EXECUTING').length,
          totalTasks: tasks.length,
          runningTasks: tasks.filter((t: { status: string }) => t.status === 'RUNNING').length,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);

  if (!mounted) {
    return (
      <DashboardLayout title="Mission Control" subtitle="Loading...">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ color: '#22d3ee' }}>Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Mission Control"
      subtitle="All systems operational"
    >
      {/* Status cards */}
      <StatusCards stats={stats} />

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Activity feed - 2 cols */}
        <ActivityFeed />
        
        {/* Agent grid - 1 col */}
        <AgentStatusGrid />
      </div>

      {/* Bottom metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
        <ThroughputChart />
        <SuccessRateChart />
        <BudgetUsage />
      </div>
    </DashboardLayout>
  );
}
