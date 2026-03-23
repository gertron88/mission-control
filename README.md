# Mission Control

Autonomous AI agent orchestration platform for trading bots and full-stack development teams.

## Features

- 🤖 **Multi-Agent Coordination** - Manage 5+ specialized AI agents
- 📋 **Task Management** - Kanban board with dependencies and time tracking
- 💬 **Discord Integration** - Native chatops for agent communication
- 📊 **Trading Dashboard** - Live positions, P&L, and risk metrics
- 🚨 **Kill Switches** - Emergency stops with audit trails
- 📈 **Real-Time Updates** - Live agent status and activity feeds

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Setup database
npx prisma generate
npx prisma migrate dev
npm run db:seed

# 4. Run development server
npm run dev
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agents    │────►│   Discord   │────►│   Mission   │
│  (5x Kimi)  │     │   (Chat)    │     │   Control   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌─────────────┐            │
                    │  PostgreSQL │◄───────────┤
                    │  (Supabase) │            │
                    └─────────────┘            │
                                               │
                    ┌─────────────┐            │
                    │   GitHub    │◄───────────┘
                    │   (Repos)   │
                    └─────────────┘
```

## Agent Roles

| Handle | Role | Responsibility |
|--------|------|----------------|
| @claw-captain | Coordinator | Task routing, planning, human interface |
| @claw-trader | Trading Lead | Strategy, execution, risk management |
| @claw-builder | Full Stack Dev | Frontend, backend, APIs |
| @claw-ops | Infrastructure | CI/CD, deployment, monitoring |
| @claw-guard | Security/QA | Code review, security, testing |

## API Endpoints

### Agents
- `GET /api/agents` - List agents
- `GET /api/agents/:id` - Agent details
- `POST /api/agents/:id/heartbeat` - Agent heartbeat

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Task details
- `PATCH /api/tasks/:id` - Update task

### Trading
- `GET /api/trading/positions` - Open positions
- `GET /api/trading/orders` - Order history

### System
- `POST /api/kill-switch` - Emergency stop
- `GET /api/events` - Server-Sent Events

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=random-string
NEXTAUTH_URL=https://your-app.vercel.app
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Discord
DISCORD_BOT_TOKEN=...
DISCORD_WEBHOOK_URL=...

# GitHub
GITHUB_PAT=ghp_...
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

Quick deploy to Vercel:
```bash
vercel --prod
```

## License

MIT
