'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Bot, 
  AlertTriangle,
  TrendingUp,
  FileText,
  Radio
} from 'lucide-react'
import { useEventSource } from '@/hooks/useEvents'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Portfolio', href: '/projects', icon: FolderKanban },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Trading', href: '/trading', icon: TrendingUp },
  { name: 'Audit Log', href: '/audit', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  const { connected } = useEventSource('/api/events')

  return (
    <div className="flex flex-col w-64 bg-slate-900 text-white h-screen fixed left-0 top-0">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Radio className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-lg">Mission Control</h1>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-400">{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Link
          href="/kill-switch"
          className="flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <AlertTriangle className="w-5 h-5" />
          Emergency Stop
        </Link>
      </div>
    </div>
  )
}
