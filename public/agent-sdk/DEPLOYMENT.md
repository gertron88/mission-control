# Multi-Agent Deployment Guide

Deploy 5 agents across separate VPS instances with shared coordination.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mission Control Dashboard                 │
│              (https://your-app.vercel.app)                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │ WebSocket/SSE       │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Agent-1     │    │  Agent-2     │    │  Agent-3     │
│  (VPS 1)     │    │  (VPS 2)     │    │  (VPS 3)     │
│  Architect   │    │  Backend     │    │  Frontend    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        │ Git Pull/Push       │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Shared Git Repo │
                    │  (GitHub/GitLab) │
                    └──────────────────┘
```

## Prerequisites

1. **Mission Control deployed** with API key
2. **Git repository** for shared workspace
3. **5 VPS instances** (or containers) for agents

## Step 1: Setup Shared Git Repository

```bash
# Create repository on GitHub/GitLab
# Clone to local and create structure:

mkdir -p mission-control-workspace/projects/mission-control
cd mission-control-workspace

# Create initial structure
cat > projects/mission-control/STATUS.md << 'EOF'
# Mission Control Project Status

**Last Updated:** Never
**Phase:** Initial Setup

## Current Tasks
- [ ] Agent deployment

## Completed
None

## Blockers
None
EOF

mkdir -p projects/mission-control/{handoffs,triggers/task-completed,triggers/blocked,triggers/urgent,planning,summaries}
mkdir -p agents

git init
git add .
git commit -m "Initial workspace structure"
git push origin main
```

## Step 2: Deploy Agent to VPS

Repeat for each VPS:

```bash
# SSH into VPS
ssh user@vps-1

# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 2. Clone shared workspace
sudo mkdir -p /opt/shared-workspace
sudo chown $(whoami):$(whoami) /opt/shared-workspace
cd /opt/shared-workspace
git clone https://github.com/your-org/mission-control-workspace.git .

# 3. Create agent directory
mkdir -p agents/agent-1

# 4. Download SDK
cd /opt
wget https://your-mission-control.vercel.app/agent-sdk/mission-control-agent.js
wget https://your-mission-control.vercel.app/agent-sdk/example-agent.js
npm init -y
npm install socket.io-client

# 5. Create environment file
cat > /opt/agent.env << 'EOF'
MISSION_CONTROL_URL=https://your-mission-control.vercel.app
MISSION_CONTROL_API_KEY=your-api-key-here
AGENT_NAME=agent-1
AGENT_ROLE=Architect
AGENT_CAPABILITIES=system-design,database-design,api-design
SHARED_WORKSPACE=/opt/shared-workspace
EOF

# 6. Create systemd service
sudo tee /etc/systemd/system/agent-1.service << 'EOF'
[Unit]
Description=Mission Control Agent 1
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt
EnvironmentFile=/opt/agent.env
ExecStart=/usr/bin/node /opt/example-agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 7. Start agent
sudo systemctl daemon-reload
sudo systemctl enable agent-1
sudo systemctl start agent-1
sudo systemctl status agent-1
```

## Step 3: Configure Each Agent

### Agent 1 - Architect (VPS 1)

```bash
AGENT_NAME=agent-1
AGENT_ROLE=Architect
AGENT_CAPABILITIES=system-design,database-design,api-design,technical-planning
```

### Agent 2 - Backend Developer (VPS 2)

```bash
AGENT_NAME=agent-2
AGENT_ROLE=Backend Developer
AGENT_CAPABILITIES=node,typescript,prisma,postgresql,rest-api,graphql
```

### Agent 3 - Frontend Developer (VPS 3)

```bash
AGENT_NAME=agent-3
AGENT_ROLE=Frontend Developer
AGENT_CAPABILITIES=react,typescript,tailwind,nextjs,ui-design
```

### Agent 4 - QA Engineer (VPS 4)

```bash
AGENT_NAME=agent-4
AGENT_ROLE=QA Engineer
AGENT_CAPABILITIES=testing,jest,cypress,code-review,quality-assurance
```

### Agent 5 - DevOps Engineer (VPS 5)

```bash
AGENT_NAME=agent-5
AGENT_ROLE=DevOps Engineer
AGENT_CAPABILITIES=docker,kubernetes,ci-cd,aws,terraform,monitoring
```

## Step 4: Verify Setup

On each VPS:

```bash
# Check agent logs
sudo journalctl -u agent-1 -f

# Check git status
cd /opt/shared-workspace
git status

# Verify agent capabilities file was created
cat agents/agent-1/capabilities.json
```

In Mission Control Dashboard:

1. Go to `/agents` - all 5 agents should appear
2. Check agent status - all should show "ONLINE"
3. Create a test task with matching capabilities

## Step 5: Test Workflow

Create a test project in Mission Control:

```json
{
  "name": "Test API Implementation",
  "tasks": [
    {
      "title": "Design database schema",
      "requiredCapabilities": ["database-design"],
      "assignee": null
    },
    {
      "title": "Implement REST API",
      "requiredCapabilities": ["node", "rest-api"],
      "dependencies": ["Design database schema"]
    }
  ]
}
```

Expected behavior:
1. Task 1 appears → Agent-1 (Architect) auto-claims
2. Agent-1 creates handoff after completion
3. Task 2 appears → Agent-2 (Backend) auto-claims
4. Agent-2 sees handoff from Agent-1

## Monitoring

### Check Agent Health

```bash
# All VPS - check all agents
for i in 1 2 3 4 5; do
  echo "=== Agent $i ==="
  ssh vps-$i "sudo systemctl is-active agent-$i"
done
```

### View Coordination Activity

```bash
# On any VPS
cd /opt/shared-workspace
git log --oneline --all -20

# Check triggers
ls -la projects/mission-control/triggers/*/

# Check handoffs
ls -la projects/mission-control/handoffs/
```

## Troubleshooting

### Agent Won't Start

```bash
# Check environment
source /opt/agent.env
echo $MISSION_CONTROL_URL
echo $AGENT_NAME

# Test manually
cd /opt
node example-agent.js
```

### Git Sync Issues

```bash
cd /opt/shared-workspace

# Reset if corrupted
git fetch origin
git reset --hard origin/main

# Check permissions
ls -la agents/
```

### Task Not Being Claimed

1. Check agent capabilities match task requirements
2. Check agent is ONLINE in Mission Control
3. Verify task status is "READY"

## Scaling

To add more agents:

1. Deploy new VPS with same setup
2. Unique `AGENT_NAME` and `AGENT_ROLE`
3. Appropriate `AGENT_CAPABILITIES`
4. Clone same shared workspace
5. Start service

Agents automatically coordinate through Mission Control + Git.
