# Mission Control Production Workflow

## Overview
Mission Control is transitioning to production mode where **all development work is managed through Mission Control itself** and executed by Hudson via the Agent SDK.

## How It Works

### 1. Task Creation
- New features, bugs, or improvements are created as **Tasks** in Mission Control
- Tasks are assigned to **Hudson** (@hudson, agent-001)
- Each task includes: title, description, estimated effort, priority

### 2. Hudson Connects via SDK
Hudson connects to Mission Control using the Agent SDK:

```bash
# Bootstrap and connect
curl -s https://mission-control.vercel.app/api/agent-sdk | \
  node - \
  --api-key=HUDSON_API_KEY \
  --name=hudson \
  --role=COORDINATOR \
  --capabilities=Planning,Coding,Review
```

### 3. Task Execution Loop
1. **Mission Control** assigns task to Hudson
2. **Hudson** receives task via WebSocket
3. **Hudson** executes task (code changes, API updates, etc.)
4. **Hudson** reports progress via heartbeat/task_progress
5. **Hudson** completes task and reports results
6. **Mission Control** marks task as COMPLETE

### 4. Deployment
- Hudson commits changes to git
- Hudson pushes to GitHub
- Vercel auto-deploys from main branch
- Hudson verifies deployment

## Task Types

### Type: FEATURE
- API endpoint creation
- UI component development  
- Database schema updates
- Integration work

### Type: BUG
- Bug fixes
- Error handling improvements
- Performance optimizations

### Type: DOCUMENTATION
- README updates
- API documentation
- Workflow guides

### Type: ANALYSIS
- Code review
- Architecture evaluation
- Security audit

## Example Task Flow

```
[User creates task] 
  ↓
"Build Activity Feed API" assigned to Hudson
  ↓
[Hudson receives via SDK]
  ↓
Hudson: "Task received, starting work..."
  ↓
[Hudson builds API endpoint]
  ↓
Hudson reports: 25% → 50% → 75% → 100%
  ↓
[Hudson commits & pushes]
  ↓
[Vercel deploys]
  ↓
Hudson: "Task complete, API live at /api/activity"
  ↓
[Task marked COMPLETE in Mission Control]
```

## Current Status

| Component | Status |
|-----------|--------|
| Agent SDK | ✅ Built and deployed |
| SDK Endpoint | ✅ `/api/agent-sdk` live |
| Hudson Agent | ⏳ Awaiting connection |
| Production Project | ⏳ Created, tasks queued |

## Next Steps

1. **Run SQL** to create production project:
   ```sql
   \i scripts/production_transition.sql
   ```

2. **Connect Hudson** using SDK curl command

3. **Assign first real task** to test workflow

4. **Monitor** via Mission Control dashboard

## API Keys Required

Hudson needs an API key to authenticate. Generate via:
- Mission Control → Agents → Hudson → Generate API Key
- Or directly in database: `UPDATE agents SET api_key_ref = 'hudson-key-001' WHERE id = 'agent-001';`

---

**This document is living** — update as the workflow evolves.
