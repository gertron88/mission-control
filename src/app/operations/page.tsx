"use client";

export const dynamic = 'force-dynamic'

import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatusCard } from "@/components/status/StatusCard";
import { SectionCard } from "@/components/layout/SectionCard";
import { DataTable } from "@/components/data/DataTable";
import { AgentGrid } from "@/components/data/AgentGrid";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/status/AlertBanner";
import { useTasks } from "@/hooks/useTasks";
import { useAgents } from "@/hooks/useAgents";
import { useDispatch } from "@/hooks/useDispatch";
import { 
  Play, 
  Pause, 
  Users, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Zap
} from "lucide-react";

export default function OperationsPage() {
  const { data: tasksData, isLoading: tasksLoading } = useTasks();
  const tasks = tasksData?.tasks ?? [];
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const dispatch = useDispatch();

  const readyTasks = tasks.filter((t) => t.status === "READY").length;
  const runningTasks = tasks.filter((t) => t.status === "RUNNING").length;
  const blockedTasks = tasks.filter((t) => t.status === "BLOCKED").length;
  const onlineAgents = agents.filter((a) => a.status === "ONLINE").length;

  const handleDispatch = () => {
    dispatch.mutate();
  };

  return (
    <DashboardShell
      title="Operations Control"
      subtitle="Task dispatch and agent management"
    >
      {/* Dispatch Controls */}
      <div className="flex items-center justify-between mb-6 p-4 bg-slate-900 text-white rounded-lg">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-slate-400">Ready Tasks</p>
            <p className="text-2xl font-bold">{readyTasks}</p>
          </div>
          <div className="w-px h-10 bg-slate-700" />
          <div>
            <p className="text-sm text-slate-400">Available Agents</p>
            <p className="text-2xl font-bold text-emerald-400">{onlineAgents}</p>
          </div>
          <div className="w-px h-10 bg-slate-700" />
          <div>
            <p className="text-sm text-slate-400">Running</p>
            <p className="text-2xl font-bold text-amber-400">{runningTasks}</p>
          </div>
        </div>

        <Button
          size="lg"
          onClick={handleDispatch}
          disabled={dispatch.isPending || readyTasks === 0}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Zap className="w-4 h-4 mr-2" />
          {dispatch.isPending ? "Dispatching..." : "Dispatch Tasks"}
        </Button>
      </div>

      {blockedTasks > 0 && (
        <AlertBanner
          type="warning"
          title={`${blockedTasks} tasks blocked`}
          message="Tasks are waiting on dependencies, credentials, or human approval."
        />
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatusCard
          title="Total Tasks"
          value={tasks.length}
          icon={CheckCircle}
          status="healthy"
          isLoading={tasksLoading}
        />
        <StatusCard
          title="Queued"
          value={tasks.filter((t) => t.status === "QUEUED").length}
          icon={Clock}
          status="healthy"
          isLoading={tasksLoading}
        />
        <StatusCard
          title="Blocked"
          value={blockedTasks}
          icon={AlertCircle}
          status={blockedTasks > 0 ? "warning" : "healthy"}
          isLoading={tasksLoading}
        />
        <StatusCard
          title="Completed Today"
          value={tasks.filter((t) => t.status === "COMPLETE").length}
          icon={CheckCircle}
          status="healthy"
          isLoading={tasksLoading}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Board */}
        <SectionCard title="Task Board" className="lg:col-span-2">
          <div className="grid grid-cols-4 gap-4">
            {["QUEUED", "READY", "RUNNING", "COMPLETE"].map((status) => (
              <div key={status} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">{status}</span>
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {tasks.filter((t) => t.status === status).length}
                  </span>
                </div>
                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.status === status)
                    .slice(0, 5)
                    .map((task) => (
                      <div
                        key={task.id}
                        className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-sm"
                      >
                        <p className="font-medium truncate">#{task.number} {task.title}</p>
                        {task.assignee && (
                          <p className="text-xs text-slate-500">@{task.assignee.handle}</p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Agent Status */}
        <SectionCard title="Agents">
          <AgentGrid agents={agents} isLoading={agentsLoading} />
        </SectionCard>

        {/* Recent Tasks */}
        <SectionCard title="Recent Tasks" className="lg:col-span-2">
          <DataTable
            data={tasks.slice(0, 10)}
            columns={[
              { key: "number", header: "#", width: "60px" },
              { key: "title", header: "Task", width: "40%" },
              { 
                key: "status", 
                header: "Status",
                render: (v) => (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    v === "COMPLETE" ? "bg-emerald-100 text-emerald-700" :
                    v === "RUNNING" ? "bg-amber-100 text-amber-700" :
                    v === "BLOCKED" ? "bg-rose-100 text-rose-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {v}
                  </span>
                )
              },
              { 
                key: "priority", 
                header: "Priority",
                render: (v) => (
                  <span className={`text-xs ${
                    v === "CRITICAL" ? "text-rose-600 font-bold" :
                    v === "HIGH" ? "text-amber-600" :
                    "text-slate-500"
                  }`}>
                    {v}
                  </span>
                )
              },
              { 
                key: "assignee", 
                header: "Assigned",
                render: (v) => v ? `@${v.handle}` : "—"
              },
            ]}
            isLoading={tasksLoading}
          />
        </SectionCard>

        {/* Activity Log */}
        <SectionCard title="Activity Log">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {[
              { event: "Task assigned", detail: "#123 → @claw-builder", time: "2m" },
              { event: "Task completed", detail: "#120", time: "5m" },
              { event: "Agent online", detail: "@claw-trader", time: "12m" },
              { event: "Blocker resolved", detail: "#115", time: "18m" },
              { event: "Dispatch run", detail: "3 tasks assigned", time: "25m" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{item.event}</p>
                  <p className="text-slate-500">{item.detail}</p>
                </div>
                <span className="text-xs text-slate-400">{item.time}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
