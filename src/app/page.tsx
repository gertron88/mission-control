import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatusCard } from "@/components/status/StatusCard";
import { SectionCard } from "@/components/layout/SectionCard";
import { DataTable } from "@/components/data/DataTable";
import { AgentGrid } from "@/components/data/AgentGrid";
import { AlertBanner } from "@/components/status/AlertBanner";
import { Sparkline } from "@/components/viz/Sparkline";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useAgents } from "@/hooks/useAgents";
import { Rocket, CheckCircle, AlertCircle, TrendingUp, Clock } from "lucide-react";

export default function DashboardPage() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ status: "BLOCKED" });
  const tasks = tasksData?.tasks ?? [];
  const { data: agents = [], isLoading: agentsLoading } = useAgents();

  const activeProjects = projects.filter((p) => p.state === "EXECUTING").length;
  const blockedTasks = tasks.length;
  const onlineAgents = agents.filter((a) => a.status === "ONLINE").length;

  return (
    <DashboardShell
      title="Executive Dashboard"
      subtitle="Real-time overview of all operations"
    >
      {/* Critical Alerts */}
      {blockedTasks > 0 && (
        <AlertBanner
          type="warning"
          title={`${blockedTasks} tasks blocked`}
          message="Tasks are waiting on dependencies or human approval."
          action={{ label: "Review", href: "/operations" }}
        />
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatusCard
          title="Active Projects"
          value={activeProjects}
          icon={Rocket}
          trend={{ value: 2, direction: "up" }}
          status="healthy"
          isLoading={projectsLoading}
        />
        <StatusCard
          title="Completed Today"
          value={12}
          icon={CheckCircle}
          trend={{ value: 5, direction: "up" }}
          status="healthy"
          isLoading={tasksLoading}
        />
        <StatusCard
          title="Blocked Tasks"
          value={blockedTasks}
          icon={AlertCircle}
          status={blockedTasks > 3 ? "critical" : blockedTasks > 0 ? "warning" : "healthy"}
          isLoading={tasksLoading}
        />
        <StatusCard
          title="Online Agents"
          value={onlineAgents}
          icon={TrendingUp}
          status="healthy"
          isLoading={agentsLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects */}
        <SectionCard
          title="Active Projects"
          className="lg:col-span-2"
          action={{ label: "View All", href: "/projects" }}
        >
          <DataTable
            data={projects.slice(0, 5)}
            columns={[
              { key: "name", header: "Project", width: "40%" },
              { 
                key: "state", 
                header: "Status",
                render: (v) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    v === "EXECUTING" ? "bg-emerald-100 text-emerald-700" :
                    v === "BLOCKED" ? "bg-rose-100 text-rose-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {v}
                  </span>
                )
              },
              { 
                key: "progress", 
                header: "Progress",
                render: (_, row) => (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${Math.random() * 60 + 40}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-600">{Math.round(Math.random() * 60 + 40)}%</span>
                  </div>
                )
              },
            ]}
            isLoading={projectsLoading}
          />
        </SectionCard>

        {/* Agent Status */}
        <SectionCard title="Agent Status" action={{ label: "Manage", href: "/operations" }}>
          <AgentGrid agents={agents.slice(0, 4)} isLoading={agentsLoading} />
        </SectionCard>

        {/* Activity Feed */}
        <SectionCard title="Recent Activity" className="lg:col-span-2">
          <div className="space-y-3">
            {[
              { action: "Task completed", item: "Trading strategy backtest", agent: "@claw-trader", time: "2 min ago" },
              { action: "Project created", item: "Analytics Portal v2", agent: "@claw-captain", time: "15 min ago" },
              { action: "Agent assigned", item: "Exchange connector setup", agent: "@claw-builder", time: "32 min ago" },
              { action: "Blocker resolved", item: "API credentials received", agent: "@claw-ops", time: "1 hour ago" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.action}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{item.item}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{item.agent}</p>
                  <p className="text-xs text-slate-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* System Health */}
        <SectionCard title="System Health">
          <div className="space-y-4">
            {[
              { name: "API", status: "healthy", latency: "45ms" },
              { name: "Database", status: "healthy", latency: "12ms" },
              { name: "Event Bus", status: "healthy", latency: "8ms" },
              { name: "Discord", status: "warning", latency: "230ms" },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    service.status === "healthy" ? "bg-emerald-500" :
                    service.status === "warning" ? "bg-amber-500" :
                    "bg-rose-500"
                  }`} />
                  <span className="text-sm font-medium">{service.name}</span>
                </div>
                <span className="text-sm text-slate-500">{service.latency}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
