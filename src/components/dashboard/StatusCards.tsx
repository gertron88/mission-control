import { Bot, Timer, CheckCircle, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

interface StatusCard {
  id: string;
  label: string;
  value: number;
  subValue: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  bgGradient: string;
  borderColor: string;
  textColor: string;
}

const statusCards: StatusCard[] = [
  {
    id: 'agents',
    label: 'Active Agents',
    value: 12,
    subValue: '2 deploying',
    change: '+2',
    trend: 'up',
    icon: <Bot className="w-5 h-5" />,
    bgGradient: 'from-cyan-500/10 to-cyan-500/5',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
  },
  {
    id: 'pending',
    label: 'Pending Tasks',
    value: 47,
    subValue: '12 high priority',
    change: '+8',
    trend: 'up',
    icon: <Timer className="w-5 h-5" />,
    bgGradient: 'from-amber-500/10 to-amber-500/5',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
  },
  {
    id: 'completed',
    label: 'Completed Today',
    value: 23,
    subValue: 'vs 18 yesterday',
    change: '+5',
    trend: 'up',
    icon: <CheckCircle className="w-5 h-5" />,
    bgGradient: 'from-emerald-500/10 to-emerald-500/5',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
  },
  {
    id: 'blocked',
    label: 'Blocked Items',
    value: 3,
    subValue: '1 critical',
    change: '-1',
    trend: 'down',
    icon: <AlertTriangle className="w-5 h-5" />,
    bgGradient: 'from-red-500/10 to-red-500/5',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
  },
];

export default function StatusCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statusCards.map((card) => (
        <div
          key={card.id}
          className={`bg-slate-800/50 backdrop-blur-md border ${card.borderColor} rounded-xl p-5 relative overflow-hidden cursor-pointer transition-all duration-200 hover:bg-slate-800/70 hover:-translate-y-0.5 bg-gradient-to-br ${card.bgGradient}`}
        >
          {/* Background decoration */}
          <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${card.textColor} opacity-5`}
            style={{ background: 'currentColor' }}
          ></div>

          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 flex items-center justify-center rounded-xl border ${card.borderColor} bg-slate-900/50 ${card.textColor}`}>
              {card.icon}
            </div>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold
              ${card.trend === 'up'
                ? card.id === 'blocked' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                : 'bg-emerald-500/15 text-emerald-400'
              }`}>
              {card.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {card.change}
            </div>
          </div>

          <div className="space-y-1">
            <div className={`text-4xl font-bold font-mono ${card.textColor} leading-none`}>
              {card.value.toString().padStart(2, '0')}
            </div>
            <div className="text-sm font-semibold text-slate-200">{card.label}</div>
            <div className="text-xs text-slate-500">{card.subValue}</div>
          </div>

          {/* Neon bottom accent */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-0.5 ${card.textColor} opacity-50`}
            style={{ background: 'currentColor' }}
          ></div>
        </div>
      ))}
    </div>
  );
}
