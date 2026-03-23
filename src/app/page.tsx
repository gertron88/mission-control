import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { ActiveProjects } from '@/components/dashboard/ActiveProjects'
import { AgentStatus } from '@/components/dashboard/AgentStatus'
import { RecentActivity } from '@/components/dashboard/RecentActivity'

export default function DashboardPage() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-500 mb-8">Overview of your autonomous agent operations</p>

          <DashboardStats />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <ActiveProjects />
            <AgentStatus />
          </div>

          <div className="mt-6">
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  )
}
