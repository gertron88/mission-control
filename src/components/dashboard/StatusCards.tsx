import { Bot, Timer, CheckCircle, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

interface CardData {
  id: string;
  label: string;
  value: number;
  subValue: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  bgFrom: string;
  bgTo: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
}

const cards: CardData[] = [
  {
    id: 'agents',
    label: 'Active Agents',
    value: 12,
    subValue: '2 deploying',
    change: '+2',
    trend: 'up',
    icon: <Bot className="w-5 h-5" />,
    bgFrom: 'from-cyan-500/10',
    bgTo: 'to-cyan-500/5',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
    accentColor: '#22d3ee',
  },
  {
    id: 'pending',
    label: 'Pending Tasks',
    value: 47,
    subValue: '12 high priority',
    change: '+8',
    trend: 'up',
    icon: <Timer className="w-5 h-5" />,
    bgFrom: 'from-amber-500/10',
    bgTo: 'to-amber-500/5',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    accentColor: '#fbbf24',
  },
  {
    id: 'completed',
    label: 'Completed Today',
    value: 23,
    subValue: 'vs 18 yesterday',
    change: '+5',
    trend: 'up',
    icon: <CheckCircle className="w-5 h-5" />,
    bgFrom: 'from-emerald-500/10',
    bgTo: 'to-emerald-500/5',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    accentColor: '#34d399',
  },
  {
    id: 'blocked',
    label: 'Blocked Items',
    value: 3,
    subValue: '1 critical',
    change: '-1',
    trend: 'down',
    icon: <AlertTriangle className="w-5 h-5" />,
    bgFrom: 'from-red-500/10',
    bgTo: 'to-red-500/5',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    accentColor: '#f87171',
  },
];

export default function StatusCards() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      {cards.map((card) => (
        <div
          key={card.id}
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${card.id === 'agents' ? 'rgba(34, 211, 238, 0.3)' : card.id === 'pending' ? 'rgba(251, 191, 36, 0.3)' : card.id === 'completed' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
            borderRadius: '12px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
          }}
        >
          {/* Background decoration */}
          <div 
            style={{
              position: 'absolute',
              right: '-16px',
              top: '-16px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: card.accentColor,
              opacity: 0.05,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                border: `1px solid ${card.id === 'agents' ? 'rgba(34, 211, 238, 0.3)' : card.id === 'pending' ? 'rgba(251, 191, 36, 0.3)' : card.id === 'completed' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                background: 'rgba(15, 23, 42, 0.5)',
                color: card.accentColor,
              }}
            >
              {card.icon}
            </div>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 600,
                background: card.id === 'blocked' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                color: card.id === 'blocked' ? '#f87171' : '#34d399',
              }}
            >
              {card.trend === 'up' ? <ArrowUp style={{ width: '12px', height: '12px' }} /> : <ArrowDown style={{ width: '12px', height: '12px' }} />}
              {card.change}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div 
              style={{
                fontSize: '36px',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: card.accentColor,
                lineHeight: 1,
              }}
            >
              {card.value.toString().padStart(2, '0')}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{card.label}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{card.subValue}</div>
          </div>

          {/* Neon bottom accent */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: card.accentColor,
              opacity: 0.5,
            }}
          />
        </div>
      ))}
    </div>
  );
}
