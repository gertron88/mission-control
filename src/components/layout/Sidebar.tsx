'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Bot,
  Cpu,
  ChevronLeft,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
}

const bottomNavItems: NavItem[] = [
  { path: '/operations', label: 'Operations', icon: <Cpu className="w-4 h-4" /> },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState({ projects: 0, tasks: 0, agents: 0 });
  const [systemStatus, setSystemStatus] = useState([
    { label: 'API Gateway', status: 'online' as const },
    { label: 'Database', status: 'online' as const },
    { label: 'WebSocket', status: 'online' as const },
  ]);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [agentsRes, projectsRes, tasksRes] = await Promise.all([
          fetch('/api/agents'),
          fetch('/api/projects'),
          fetch('/api/tasks'),
        ]);

        const agents = agentsRes.ok ? await agentsRes.json() : [];
        const projects = projectsRes.ok ? await projectsRes.json() : [];
        const tasksData = tasksRes.ok ? await tasksRes.json() : { data: [] };

        setCounts({
          projects: projects.length,
          tasks: (tasksData.data || []).length,
          agents: agents.length,
        });
      } catch (err) {
        console.error('Failed to fetch sidebar counts:', err);
      }
    }

    async function fetchSystemStatus() {
      try {
        const res = await fetch('/api/health/services');
        if (res.ok) {
          const data = await res.json();
          setSystemStatus(data.slice(0, 3).map((s: any) => ({
            label: s.name,
            status: s.status
          })));
        }
      } catch (err) {
        console.error('Failed to fetch system status:', err);
      }
    }

    fetchCounts();
    fetchSystemStatus();
    
    // Poll system status every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { path: '/trading', label: 'Trading', icon: <TrendingUp className="w-4 h-4" /> },
    { path: '/projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4" />, badge: counts.projects },
    { path: '/tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" />, badge: counts.tasks, badgeColor: 'bg-red-500' },
    { path: '/agents', label: 'Agents', icon: <Bot className="w-4 h-4" />, badge: counts.agents },
  ];

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <>
      <style jsx>{`
        @media (max-width: 768px) {
          .sidebar {
            display: none !important;
          }
          .mobile-nav {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(10, 17, 32, 0.98)',
        borderTop: '1px solid rgba(51, 65, 85, 0.5)',
        zIndex: 40,
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
      }}>
        {navItems.slice(0, 5).map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '8px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: active ? '#67e8f9' : '#94a3b8',
                background: active ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                minWidth: '60px',
              }}
            >
              <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </div>
              <span style={{ fontSize: '10px', fontWeight: 500 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <aside
        className="sidebar"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          width: collapsed ? '64px' : '256px',
          background: 'rgba(10, 17, 32, 0.98)',
          borderRight: '1px solid rgba(51, 65, 85, 0.5)',
          transition: 'width 0.3s',
        }}
      >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid rgba(30, 41, 59, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            flexShrink: 0, 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(6, 182, 212, 0.2)', 
            border: '1px solid rgba(6, 182, 212, 0.3)' 
          }}>
            <LayoutDashboard className="w-5 h-5" style={{ color: '#22d3ee' }} />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.025em', color: 'white', whiteSpace: 'nowrap' }}>Mission Control</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }}></span>
                <span style={{ fontSize: '10px', color: '#34d399', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>LIVE</span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer', border: 'none', background: 'transparent' }}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {!collapsed && (
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 600, paddingLeft: '12px', marginBottom: '12px' }}>
            Command Center
          </p>
        )}
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                border: active ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent',
                background: active ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: active ? '#67e8f9' : '#94a3b8',
              }}
            >
              <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </div>
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span style={{ 
                      fontSize: '10px', 
                      fontFamily: 'monospace', 
                      padding: '2px 6px', 
                      borderRadius: '9999px', 
                      background: item.badgeColor || '#475569',
                      color: 'white'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}

        {!collapsed && (
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 600, paddingLeft: '12px', marginTop: '24px', marginBottom: '12px' }}>
            Infrastructure
          </p>
        )}
        {bottomNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                border: active ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent',
                background: active ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: active ? '#67e8f9' : '#64748b',
              }}
            >
              <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </div>
              {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* System status */}
      {!collapsed && (
        <div style={{ padding: '12px', borderTop: '1px solid rgba(30, 41, 59, 0.6)' }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 600, marginBottom: '10px' }}>
            System Status
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {systemStatus.map((sys) => (
              <div key={sys.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{sys.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sys.status === 'online' ? '#34d399' : '#fbbf24' }}></div>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', color: sys.status === 'online' ? '#34d399' : '#fbbf24' }}>
                    {sys.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(30, 41, 59, 0.6)', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #06b6d4, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'white' }}>MC</span>
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Mission Control</p>
            <p style={{ fontSize: '10px', color: '#64748b' }}>Admin</p>
          </div>
        )}
      </div>
      </aside>
    </>
  );
}
