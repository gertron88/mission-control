'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Bot,
  Remote,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { path: '/projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4" />, badge: 9 },
  { path: '/tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" />, badge: 3, badgeColor: 'bg-red-500' },
  { path: '/agents', label: 'Agents', icon: <Bot className="w-4 h-4" />, badge: 10 },
];

const bottomNavItems: NavItem[] = [
  { path: '/operations', label: 'Operations', icon: <Remote className="w-4 h-4" /> },
];

const systemStatus = [
  { label: 'API Gateway', status: 'online' as const },
  { label: 'Model Inference', status: 'online' as const },
  { label: 'Vector DB', status: 'degraded' as const },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ background: 'rgba(10, 17, 32, 0.98)', borderRight: '1px solid rgba(51, 65, 85, 0.5)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-cyan-500/20 border border-cyan-500/30">
            <LayoutDashboard className="w-5 h-5 text-cyan-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-bold text-sm tracking-wide text-white whitespace-nowrap">Mission Control</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>
                <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">LIVE</span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-200 cursor-pointer flex-shrink-0 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-3 mb-3">
            Command Center
          </p>
        )}
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group whitespace-nowrap ${
                active
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${active ? 'text-cyan-400' : ''}`}>
                {item.icon}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 text-sm">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-700 text-slate-300'} text-white`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}

        {!collapsed && (
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-3 mt-6 mb-3">
            Infrastructure
          </p>
        )}
        {bottomNavItems.map((item) => (
          <div
            key={item.path}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 border border-transparent cursor-not-allowed opacity-50 whitespace-nowrap"
          >
            <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            {!collapsed && (
              <>
                <span className="flex-1 text-sm">{item.label}</span>
                <span className="text-[9px] bg-slate-700/50 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                  Soon
                </span>
              </>
            )}
          </div>
        ))}
      </nav>

      {/* System status */}
      {!collapsed && (
        <div className="px-3 py-4 border-t border-slate-800/60">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2.5">
            System Status
          </p>
          <div className="space-y-1.5">
            {systemStatus.map((sys) => (
              <div key={sys.label} className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{sys.label}</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      sys.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  ></div>
                  <span
                    className={`text-[10px] font-mono uppercase ${
                      sys.status === 'online' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {sys.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User */}
      <div className={`px-3 py-3 border-t border-slate-800/60 flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">MC</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Mission Control</p>
            <p className="text-[10px] text-slate-500 truncate">Admin</p>
          </div>
        )}
      </div>
    </aside>
  );
}
