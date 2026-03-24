import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  handle: string;
  name?: string;
  status: string;
  currentLoad: number;
  maxLoad: number;
  role?: string;
  avatar?: string;
}

interface AgentGridProps {
  agents: Agent[];
  isLoading?: boolean;
}

export function AgentGrid({ agents, isLoading }: AgentGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No agents available
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    ONLINE: "bg-emerald-500",
    BUSY: "bg-amber-500",
    OFFLINE: "bg-slate-400",
    ERROR: "bg-rose-500",
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                statusColors[agent.status] || "bg-slate-400"
              )}
            />
            <span className="font-medium text-sm truncate">{agent.handle}</span>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Load</span>
              <span>
                {agent.currentLoad}/{agent.maxLoad}
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-slate-200 rounded-full">
              <div
                className={cn(
                  "h-full rounded-full",
                  agent.currentLoad / agent.maxLoad > 0.8
                    ? "bg-rose-500"
                    : agent.currentLoad / agent.maxLoad > 0.5
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                )}
                style={{
                  width: `${(agent.currentLoad / agent.maxLoad) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
