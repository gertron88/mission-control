import Link from "next/link";
import { LayoutDashboard, Bot, Activity, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Trading", href: "/trading", icon: Bot },
  { label: "Operations", href: "/operations", icon: Activity },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-slate-900 text-slate-100 flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-emerald-400">●</span>
          Mission Control
        </h1>
        <p className="text-xs text-slate-400 mt-1">Autonomous AI Operations</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 text-xs font-bold">MC</span>
          </div>
          <div className="text-sm">
            <p className="font-medium text-white">Admin</p>
            <p className="text-xs text-slate-400">Online</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
