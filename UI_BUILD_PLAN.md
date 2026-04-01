# Mission Control UI Build Plan

## Phase 1: Foundation (30 min)
- [ ] Dark theme color system (tailwind.config.ts)
- [ ] Global CSS variables for mission-control aesthetic
- [ ] Font selection (JetBrains Mono for data, Inter for UI)
- [ ] Base layout shell improvements

## Phase 2: Layout & Navigation (45 min)
- [ ] Sidebar redesign with collapsible sections
- [ ] Breadcrumb navigation
- [ ] Page header with live status indicator
- [ ] Responsive grid system

## Phase 3: Real-time Infrastructure (60 min)
- [ ] WebSocket hook for agent events
- [ ] Polling mechanism for stats
- [ ] Connection status indicator (connected/disconnected)
- [ ] Auto-retry logic

## Phase 4: Dashboard Widgets (90 min)
- [ ] Status cards with live pulse indicators
- [ ] Mini sparkline charts for trends
- [ ] Activity feed component
- [ ] System health panel with animated status

## Phase 5: Agent Views (60 min)
- [ ] Agent card redesign with avatar, status, activity
- [ ] Agent detail modal
- [ ] Agent filter/sort controls
- [ ] Real-time agent log stream

## Phase 6: Quick Actions (45 min)
- [ ] Command palette (Cmd+K)
- [ ] Floating action button for dispatch
- [ ] Emergency kill switch (prominent, safe)
- [ ] Quick filter chips

## Phase 7: Notifications (30 min)
- [ ] Toast notification system
- [ ] Unread badge on sidebar
- [ ] Critical alert banner improvements
- [ ] Sound notifications (optional)

## Design Tokens
- Background: slate-950
- Surface: slate-900/800
- Border: slate-700/600
- Text Primary: slate-100
- Text Secondary: slate-400
- Success: emerald-500 (pulse animation)
- Warning: amber-500
- Error: rose-500
- Info: cyan-500
- Accent Glow: cyan-500/20
