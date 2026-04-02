# Project: Eliminate Hardcoded Data
**Status:** PLANNING → EXECUTING  
**Project ID:** project-eliminate-hardcoded-data  
**Owner:** Hudson (Coordinator)  
**Budget:** $25,000  
**Timeline:** 110 estimated hours

---

## Executive Summary

Mission Control has **10 critical sections** with hardcoded/static data that must be migrated to database-driven feeds before production. This project systematically replaces all placeholder content with live APIs and database queries.

---

## Current State (Problems Identified)

### Homepage (`/`)
| Section | Current State | Target State |
|---------|---------------|--------------|
| Activity Feed | "Coming soon..." placeholder | Live activity log from database |
| Agent Status Grid | "Coming soon..." placeholder | Live agent heartbeats & status |
| Task Throughput | Static bar chart [40,65,48...] | Real 24h completion metrics |
| Success Rate | Static 87.5% with fake numbers | Calculated from actual tasks |
| Budget Usage | Static 68%, 45%, 22% | Real API/compute/storage usage |

### Placeholder Pages
| Page | Current State | Target State |
|------|---------------|--------------|
| Operations (`/operations`) | "Coming soon" | Full ops dashboard |
| Trading (`/trading`) | "Coming soon" | Trading performance dashboard |
| Kill Switch (`/kill-switch`) | "Coming soon" | Functional emergency stop UI |

### Sidebar
| Component | Current State | Target State |
|-----------|---------------|--------------|
| System Status | Hardcoded (online/online/degraded) | Live health check pings |

---

## Phase 1: Homepage Critical Sections (CRITICAL)

### Task 1: Activity Feed with Database Backend
**Priority:** CRITICAL | **Effort:** 12h
- [ ] Create `ActivityLog` table
- [ ] Event types: task_created, task_completed, agent_connected, etc.
- [ ] Build `/api/activity` endpoint
- [ ] Create ActivityFeed UI component
- [ ] Real-time updates via WebSocket

### Task 2: Agent Status Grid with Live Data
**Priority:** CRITICAL | **Effort:** 8h
- [ ] Create AgentStatusGrid component
- [ ] Show Hudson + all agents
- [ ] Live heartbeat data
- [ ] Current task assignment
- [ ] CPU/memory from latest heartbeat

### Task 3: Real Task Throughput Metrics
**Priority:** HIGH | **Effort:** 10h
- [ ] Aggregate task completions from audit logs
- [ ] Build `/api/metrics/throughput`
- [ ] Hourly counts for last 24h
- [ ] Dynamic bar chart rendering

### Task 4: Real Success Rate Metrics
**Priority:** HIGH | **Effort:** 8h
- [ ] Calculate 7-day success rate
- [ ] Build `/api/metrics/success-rate`
- [ ] Real completed/failed/retried counts
- [ ] Update UI with live percentage

### Task 5: Real Budget Usage Tracking
**Priority:** HIGH | **Effort:** 12h
- [ ] Create `BudgetUsage` table
- [ ] Track API calls, compute, storage
- [ ] Build `/api/metrics/budget`
- [ ] Live progress bars per category

**Phase 1 Total: 50 hours**

---

## Phase 2: Placeholder Pages (MEDIUM)

### Task 6: Build Operations Page
**Priority:** MEDIUM | **Effort:** 16h
- Active deployments
- System health metrics
- Resource utilization
- Recent deployments
- Error rates

### Task 7: Build Trading Page
**Priority:** MEDIUM | **Effort:** 16h
- Active trading agents
- Portfolio performance
- Recent trades
- P&L summary
- Risk metrics

### Task 8: Build Kill Switch Page
**Priority:** HIGH | **Effort:** 12h
- Connected agents list
- Kill button per agent
- Global kill all
- Confirmation dialogs
- Kill history log

**Phase 2 Total: 44 hours**

---

## Phase 3: Final Cleanup (HIGH)

### Task 9: Live System Status in Sidebar
**Priority:** MEDIUM | **Effort:** 8h
- Health check pings
- Real service status
- Pulsing indicators

### Task 10: Final Audit and Cleanup
**Priority:** HIGH | **Effort:** 10h
- Search codebase for remaining mocks
- Document all findings
- Replace with database calls
- Update tests

**Phase 3 Total: 18 hours**

---

## Reporting Structure

### Daily Standup (Hudson reports to user)
- Tasks completed yesterday
- Tasks in progress today
- Blockers or issues

### Weekly Summary
- Progress % update
- Hours spent vs estimated
- Budget consumed
- Next week's priorities

### Completion Criteria
- [ ] All "coming soon" placeholders replaced
- [ ] No hardcoded numbers in UI
- [ ] All data flows from database
- [ ] 100% of API endpoints return live data
- [ ] User can verify data freshness

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database performance | Medium | High | Add indexes, caching |
| API rate limits | Low | Medium | Implement batching |
| Scope creep | High | Medium | Strict phase gates |

---

## Next Steps

1. **Run SQL** to create project and tasks in Supabase
2. **Hudson begins** Task 1 (Activity Feed)
3. **Daily reports** via Discord
4. **Track progress** in Mission Control dashboard

**Ready to execute. Awaiting go-ahead.**
