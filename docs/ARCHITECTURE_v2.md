# Mission Control: Autonomous Project Operations Layer

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              HUMAN LEADERSHIP LAYER                                  │
│                           (Strategic Direction, Override)                            │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           MISSION CONTROL (This System)                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                       PORTFOLIO COMMAND CENTER                                 │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │  │
│  │  │   Project    │ │   Priority   │ │   Resource   │ │   Portfolio Health   │ │  │
│  │  │   Registry   │ │   Engine     │ │   Allocator  │ │     Dashboard        │ │  │
│  │  ├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────────────┤ │  │
│  │  │ • Active     │ │ • Score by   │ │ • Agent      │ │ • Risk heatmap       │ │  │
│  │  │   projects   │ │   strategic  │ │   capacity   │ │ • Deadline threats   │ │  │
│  │  │ • Budgets    │ │   alignment  │ │ • Budget per │ │ • Shared blockers    │ │  │
│  │  │ • Deadlines  │ │ • Urgency    │ │   project    │ │ • Capacity conflicts │ │  │
│  │  │ • SLAs       │ │ • Unlock     │ │ • Cross-proj │ │ • Executive report   │ │  │
│  │  │ • Critical   │ │   value      │ │   allocation │ │                      │ │  │
│  │  │   path       │ │              │ │              │ │                      │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────┘ │  │
│  └────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                       │                                              │
│                                       ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                      PROJECT CONTROL TOWERS (Per Project)                      │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                │  │
│  │   Project: Trading Bot v1          Project: Analytics Portal                   │  │
│  │   ┌──────────────────────┐         ┌──────────────────────┐                    │  │
│  │   │  State: EXECUTING    │         │  State: PLANNING     │                    │  │
│  │   ├──────────────────────┤         ├──────────────────────┤                    │  │
│  │   │  Charter             │         │  Charter             │                    │  │
│  │   │  Success metrics     │         │  Success metrics     │                    │  │
│  │   │  Milestone graph     │         │  Milestone graph     │                    │  │
│  │   │  Dependency map      │         │  Dependency map      │                    │  │
│  │   │  Risk register       │         │  Risk register       │                    │  │
│  │   │  Decision log        │         │  Decision log        │                    │  │
│  │   │  Project memory      │         │  Project memory      │                    │  │
│  │   └──────────────────────┘         └──────────────────────┘                    │  │
│  │                                                                                │  │
│  │   State Machine: PROPOSED → APPROVED → PLANNING → EXECUTING → MONITORING →   │  │
│  │                    ↓          ↓         ↓          ↓           ↓         ↓     │  │
│  │                 ARCHIVED   BLOCKED  ROLLBACK  FAILED  COMPLETED               │  │
│  │                                                                                │  │
│  └────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                       │                                              │
│                                       ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                     WORK DECOMPOSITION ENGINE                                   │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                │  │
│  │   Input: "Ship backtesting dashboard"                                          │  │
│  │              │                                                                 │  │
│  │              ▼                                                                 │  │
│  │   ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐   │  │
│  │   │   MILESTONE 1       │  │   MILESTONE 2       │  │   MILESTONE 3       │   │  │
│  │   │   Define Scope      │  │   Build Core        │  │   Deploy            │   │  │
│  │   │   ├─ Product spec   │  │   ├─ Backend APIs   │  │   ├─ Staging QA     │   │  │
│  │   │   ├─ UI mockups     │  │   ├─ Frontend       │  │   ├─ Production     │   │  │
│  │   │   └─ Architecture   │  │   ├─ Database       │  │   └─ Monitoring     │   │  │
│  │   │                     │  │   └─ Auth           │  │                     │   │  │
│  │   └─────────────────────┘  └─────────────────────┘  └─────────────────────┘   │  │
│  │              │                       │                       │                  │  │
│  │              └───────────────────────┼───────────────────────┘                  │  │
│  │                                      ▼                                          │  │
│  │   ┌─────────────────────────────────────────────────────────────────────────┐   │  │
│  │   │                      TASK DAG (Dependency Graph)                         │   │  │
│  │   │  Task A ──► Task B ──► Task C ──► Task D                                 │   │  │
│  │   │              │          │                                                │   │  │
│  │   │              ▼          ▼                                                │   │  │
│  │   │           Task E    Task F                                               │   │  │
│  │   │              │          │                                                │   │  │
│  │   │              └────┬─────┘                                                │   │  │
│  │   │                   ▼                                                      │   │  │
│  │   │                Task G (Validation Gate)                                  │   │  │
│  │   └─────────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                                │  │
│  └────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                       │                                              │
│                                       ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                    AUTONOMOUS TASK BOARD (Execution Fabric)                    │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │  QUEUED  │  │  READY   │  │ RUNNING  │  │ VALIDATE │  │ COMPLETE │        │  │
│  │  │          │  │          │  │          │  │          │  │          │        │  │
│  │  │ • Wait   │  │ • All    │  │ • Agent  │  │ • Check  │  │ • Done   │        │  │
│  │  │   for    │  │   deps   │  │   active │  │   output │  │ • Audit  │        │  │
│  │  │   prio   │  │ • Tools  │  │ • Time   │  │ • AC met?│  │   trail  │        │  │
│  │  │          │  │   avail  │  │   track  │  │ • Tests? │  │          │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │  │
│  │                                                                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                                    │  │
│  │  │ BLOCKED  │  │  FAILED  │  │ CANCELED │                                    │  │
│  │  │          │  │          │  │          │                                    │  │
│  │  │ • Dep    │  │ • Retry  │  │ • Obsolete                                   │  │
│  │  │   unmet  │  │   count  │  │ • No longer                                  │  │
│  │  │ • Human  │  │   high   │  │   needed                                     │  │
│  │  │   review │  │ • Fatal  │  │                                              │  │
│  │  │ • Risk   │  │   error  │  │                                              │  │
│  │  └──────────┘  └──────────┘  └──────────┘                                    │  │
│  │                                                                                │  │
│  │  Task Schema: { id, projectId, milestoneId, type, priority, dependencies,    │  │
│  │                requiredTools, assigneeRole, estimatedEffort, status,          │  │
│  │                outputs, validationCriteria, retryRules, escalationPolicy }    │  │
│  │                                                                                │  │
│  └────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                       │                                              │
│                                       ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                        AGENT DISPATCHER                                        │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                │  │
│  │   Dispatch Scoring Formula:                                                   │  │
│  │                                                                                │  │
│  │   Score = priority + urgency + unlock_value + strategic_value                │  │
│  │           - execution_risk - cost - agent_overload                           │  │
│  │                                                                                │  │
│  │   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     │  │
│  │   │   Task Pool      │     │   Agent Pool     │     │   Assignment     │     │  │
│  │   │   ├─ Type        │────►│   ├─ Skills      │────►│   ├─ Match by    │     │  │
│  │   │   ├─ Tools       │     │   ├─ Tools       │     │   ├─ Capability  │     │  │
│  │   │   ├─ Priority    │     │   ├─ Load        │     │   ├─ Load        │     │  │
│  │   │   ├─ Risk Level  │     │   ├─ Trust Level │     │   ├─ Success Rate│     │  │
│  │   │   └─ Due Date    │     │   └─ Cost        │     │   └─ Approval Gate│    │  │
│  │   └──────────────────┘     └──────────────────┘     └──────────────────┘     │  │
│  │                                                                                │  │
│  └────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                       │                                              │
│                                       ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                     DEPENDENCY & BLOCKER ENGINE                                │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                │  │
│  │   Blocker Types:                          Auto-Resolution:                    │  │
│  │   ├─ Task dependency unmet       ──────►  Re-sequence downstream              │  │
│  │   ├─ Human approval pending      ──────►  Request from approver               │  │
│  │   ├─ Missing credentials         ──────►  Spin credential request task        │  │
│  │   ├─ Failing tests               ──────►  Assign debugging agent              │  │
│  │   ├─ Infra unavailable           ──────►  Escalate to @claw-ops               │  │
│  │   ├─ Ambiguous requirements      ──────►  Request clarification               │  │
│  │   └─ Risk threshold exceeded     ──────►  Escalate to human                   │  │
│  │                                                                                │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │  │
│  │  │  VALIDATION     │ │  ESCALATION     │ │  CONTROL LOOPS  │ │  AUDIT      │ │  │
│  │  │  & QA GATE      │ │  CONSOLE        │ │                 │ │  & EVENTS   │ │  │
│  │  ├─────────────────┤ ├─────────────────┤ ├─────────────────┤ ├─────────────┤ │  │
│  │  │ • AC checks     │ │ • Approval      │ │ • Strategic     │ │ • Immutable │ │  │
│  │  │ • Tests pass    │ │   queue         │ │ • Planning      │ │   log       │ │  │
│  │  │ • Security scan │ │ • Risk alerts   │ │ • Execution     │ │ • Decision  │ │  │
│  │  │ • Deploy check  │ │ • Budget warn   │ │ • Validation    │ │   record    │ │  │
│  │  │ • Docs updated  │ │ • Deadline risk │ │ • Recovery      │ │ • Agent     │ │  │
│  │  │ • Budget/time   │ │ • Policy vio    │ │                 │ │   actions   │ │  │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
          │                               │                               │
          ▼                               ▼                               ▼
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│    AGENT LAYER      │      │    DATA LAYER       │      │   HUMAN LAYER       │
│                     │      │                     │      │                     │
│  @claw-captain      │      │  ┌───────────────┐  │      │  Approval Console   │
│  @claw-trader       │      │  │  PostgreSQL   │  │      │  Emergency Stop     │
│  @claw-builder      │      │  ├───────────────┤  │      │  Strategy Input     │
│  @claw-ops          │      │  │  • Projects   │  │      │  Override Controls  │
│  @claw-guard        │      │  │  • Tasks      │  │      │                     │
│                     │      │  │  • Agents     │  │      │  Discord Channels:  │
│  Pulls work from    │      │  │  • Artifacts  │  │      │  #approvals         │
│  task board         │      │  │  • Decisions  │  │      │  #alerts            │
│  Reports progress   │      │  │  • Risks      │  │      │  #incidents         │
│  Attaches outputs   │      │  │  • Events     │  │      │                     │
│                     │      │  └───────────────┘  │      │                     │
│  Cannot:            │      │                     │      │                     │
│  - Change goals     │      │  Event Bus (SSE)    │      │                     │
│  - Bypass gates     │      │  Policy Engine      │      │                     │
│  - Self-approve     │      │  Artifact Registry  │      │                     │
│  - Delete audit     │      │                     │      │                     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
```

---

## Core Operating Model: Hierarchy

```
Portfolio → Project → Milestone → Task → Agent Action

Example:
┌────────────────────────────────────────────────────────────────────────┐
│ PORTFOLIO: "Q2 Trading Platform Initiative"                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ PROJECT: "Trading Bot v1"                                      │   │
│  │ Priority: HIGH | Budget: $5K | Deadline: 2026-04-30            │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  MILESTONE 1: "Strategy Design" [COMPLETE]                     │   │
│  │  ├─ Task 1.1: Research mean reversion [claw-trader] ✓         │   │
│  │  ├─ Task 1.2: Define risk parameters [claw-trader] ✓          │   │
│  │  └─ Task 1.3: Document strategy spec [claw-captain] ✓         │   │
│  │                                                                  │   │
│  │  MILESTONE 2: "MVP Build" [EXECUTING]                          │   │
│  │  ├─ Task 2.1: Setup exchange connector [claw-builder] ▶       │   │
│  │  ├─ Task 2.2: Implement strategy engine [claw-trader] ▶       │   │
│  │  ├─ Task 2.3: Build monitoring dashboard [claw-builder] ⏸     │   │
│  │  │   BLOCKED: Waiting for 2.1                                │   │
│  │  └─ Task 2.4: Security audit [claw-guard] ⏸                  │   │
│  │      BLOCKED: Waiting for 2.2                                │   │
│  │                                                                  │   │
│  │  MILESTONE 3: "Deployment" [PLANNED]                           │   │
│  │  └─ (Tasks not yet decomposed)                                │   │
│  │                                                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ PROJECT: "Analytics Portal"                                    │   │
│  │ Priority: MEDIUM | Budget: $3K | Deadline: 2026-05-15          │   │
│  │ State: PLANNING                                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## State Machines

### Project State Machine

```
                    ┌─────────────┐
         ┌─────────►│  PROPOSED   │◄────────┐
         │          └──────┬──────┘         │
         │                 │ approve        │ (re-propose)
         │                 ▼                │
         │          ┌─────────────┐         │
         │          │  APPROVED   │         │
         │          └──────┬──────┘         │
         │                 │ start planning │
         │                 ▼                │
┌────────┴────────┐   ┌─────────────┐       │
│    ARCHIVED     │◄──│  PLANNING   │       │
└─────────────────┘   └──────┬──────┘       │
      ▲                      │ begin exec   │
      │                      ▼              │
      │               ┌─────────────┐       │
      │    ┌─────────│  EXECUTING  │───────┤
      │    │         └──────┬──────┘       │
      │    │                │              │
      │    │    ┌───────────┼───────────┐  │
      │    │    │           │           │  │
      │    ▼    ▼           ▼           ▼  │
      │ ┌───────┐    ┌──────────┐   ┌────┐ │
      └─┤BLOCKED│    │AWAITING  │   │FAIL│─┘
        └───┬───┘    │REVIEW    │   └────┘
            │        └────┬─────┘
            │             │ approve
            ▼             ▼
       ┌────────┐    ┌─────────┐
       │ROLLBACK│    │DEPLOYING│
       └───┬────┘    └────┬────┘
           │              │
           ▼              ▼
      ┌─────────┐    ┌──────────┐
      │ FAILED  │    │MONITORING│
      └─────────┘    └────┬─────┘
                          │ stable
                          ▼
                     ┌──────────┐
                     │COMPLETED │
                     └──────────┘
```

### Task State Machine

```
QUEUED ──► READY ──► ASSIGNED ──► RUNNING ──► AWAITING_VALIDATION ──► COMPLETE
             │          │            │                │
             │          │            │                ▼
             │          │            │           ┌─────────┐
             │          │            │           │ CANCELED│
             │          │            │           └─────────┘
             │          │            ▼
             │          │      AWAITING_DEPENDENCY
             │          │            │
             │          ▼            │ (dependency met)
             │      ┌─────────┐◄─────┘
             └─────►│ BLOCKED │
                    └────┬────┘
                         │
                         │ (unblock attempted)
                         ▼
                    ┌─────────┐
                    │ FAILED  │
                    └────┬────┘
                         │ (retries exhausted)
                         ▼
                    ┌─────────────┐
                    │ESCALATED TO │
                    │   HUMAN     │
                    └─────────────┘
```

---

## Control Loops

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTINUOUS CONTROL LOOPS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐                                                     │
│  │  STRATEGIC LOOP     │  Runs: Daily/Weekly                                │
│  │                     │                                                     │
│  │  • Re-prioritize    │  Inputs: Business goals, market changes           │
│  │    projects         │  Outputs: Updated portfolio priorities            │
│  │  • Adjust budgets   │                                                     │
│  │  • Approve/pause    │  Actor: Portfolio Command Center                  │
│  │    initiatives      │                                                     │
│  └─────────────────────┘                                                     │
│                                                                              │
│  ┌─────────────────────┐                                                     │
│  │  PLANNING LOOP      │  Runs: Per project cadence                         │
│  │                     │                                                     │
│  │  • Update milestones│  Inputs: Project velocity, blockers               │
│  │  • Decompose work   │  Outputs: New tasks, revised timeline             │
│  │  • Revise deps      │                                                     │
│  │  • Forecast         │  Actor: Project Control Tower                     │
│  └─────────────────────┘                                                     │
│                                                                              │
│  ┌─────────────────────┐                                                     │
│  │  EXECUTION LOOP     │  Runs: Continuously (seconds)                      │
│  │                     │                                                     │
│  │  • Dispatch ready   │  Inputs: Task board state, agent availability     │
│  │    tasks            │  Outputs: Task assignments, state changes         │
│  │  • Monitor progress │                                                     │
│  │  • Retry failures   │  Actor: Agent Dispatcher                          │
│  │  • Unblock work     │                                                     │
│  └─────────────────────┘                                                     │
│                                                                              │
│  ┌─────────────────────┐                                                     │
│  │  VALIDATION LOOP    │  Runs: On task completion                          │
│  │                     │                                                     │
│  │  • Check acceptance │  Inputs: Task outputs, criteria                   │
│  │    criteria         │  Outputs: Pass/fail, advancement approval         │
│  │  • Run tests        │                                                     │
│  │  • Verify artifacts │  Actor: Validation & QA Gate                      │
│  │  • Security scan    │                                                     │
│  └─────────────────────┘                                                     │
│                                                                              │
│  ┌─────────────────────┐                                                     │
│  │  RECOVERY LOOP      │  Runs: On failure detection                        │
│  │                     │                                                     │
│  │  • Detect anomaly   │  Inputs: Failure events, risk metrics             │
│  │  • Isolate scope    │  Outputs: Rollback commands, replan tasks         │
│  │  • Execute rollback │                                                     │
│  │  • Replan           │  Actor: Escalation Console + Human                │
│  │  • Escalate         │                                                     │
│  └─────────────────────┘                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FIRST-CLASS OBJECTS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PORTFOLIO                    PROJECT                       MILESTONE        │
│  ─────────                    ───────                       ─────────        │
│  id: string                   id: string                    id: string       │
│  name: string                 portfolioId: string           projectId: string│
│  strategy: string             name: string                  name: string     │
│  budgetTotal: decimal         charter: text                 description: text│
│  priorities: json             objectives: json              dueDate: date    │
│  capacityRules: json          successMetrics: json          dependencies:[]  │
│  activeProjectIds: []         state: enum                   state: enum      │
│                              milestoneGraph: json                           │
│                              riskRegister: []                               │
│                              decisionLog: []                                │
│                              memory: json                                   │
│                                                                              │
│  TASK                         AGENT                         ARTIFACT         │
│  ────                         ─────                         ────────         │
│  id: string                   id: string                    id: string       │
│  projectId: string            handle: string                taskId: string   │
│  milestoneId: string          name: string                  type: enum       │
│  type: enum                   role: enum                    url: string      │
│  priority: enum               capabilities: []              metadata: json   │
│  dependencies: []             trustLevel: number            createdAt: date  │
│  requiredTools: []            costPerHour: decimal                           │
│  assigneeRole: string         currentLoad: number                            │
│  estimatedEffort: hours       status: enum                                   │
│  status: enum                 apiKeyRef: string                              │
│  outputs: json                                                               │
│  validationCriteria: json                                                    │
│  retryRules: json                                                            │
│  escalationPolicy: json                                                      │
│                                                                              │
│  DECISION                     RISK                          EVENT            │
│  ────────                     ────                          ─────            │
│  id: string                   id: string                    id: string       │
│  projectId: string            projectId: string             type: string     │
│  title: string                title: string                 timestamp: date  │
│  description: text            description: text             actorType: enum  │
│  rationale: text              likelihood: enum              actorId: string  │
│  author: string               impact: enum                  resourceType: string
│  approvals: []                mitigation: text              resourceId: string
│  state: enum                  owner: string                 beforeState: json
│  createdAt: date              status: enum                  afterState: json │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Memory Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MEMORY ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │  OPERATIONAL MEMORY (Short-lived, execution context)                   │   │
│  │  ─────────────────────────────────────────────────                    │   │
│  │  • Current task assignments                                            │   │
│  │  • Active blockers and their status                                    │   │
│  │  • Recent failures and retry counts                                    │   │
│  │  • Current branch/environment status                                   │   │
│  │  • Live agent heartbeats                                               │   │
│  │                                                                        │   │
│  │  Storage: Redis / In-memory cache   TTL: Hours                         │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │  PROJECT MEMORY (Persistent, per-project knowledge)                    │   │
│  │  ───────────────────────────────────────────────────                   │   │
│  │  • Specifications and architecture decisions                           │   │
│  │  • Decision log with rationale                                         │   │
│  │  • Known issues and workarounds                                        │   │
│  │  • Lessons learned                                                     │   │
│  │  • Stakeholder preferences                                             │   │
│  │  • Project-specific patterns                                           │   │
│  │                                                                        │   │
│  │  Storage: PostgreSQL (project.memory)   Lifespan: Project lifetime     │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │  ORGANIZATIONAL MEMORY (Reusable, cross-project)                       │   │
│  │  ─────────────────────────────────────────────────                     │   │
│  │  • Deployment playbooks                                                │   │
│  │  • Incident runbooks                                                   │   │
│  │  • Template task graphs (by project type)                              │   │
│  │  • Standard architectures                                              │   │
│  │  • Validation rules and checklists                                     │   │
│  │  • Best-known solutions (RAG-enabled)                                  │   │
│  │  • Agent skill profiles and performance history                        │   │
│  │                                                                        │   │
│  │  Storage: Vector DB (pgvector) + PostgreSQL   Lifespan: Indefinite     │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Views

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MISSION CONTROL UI                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  1) PORTFOLIO MAP                                                       │ │
│  │                                                                         │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│  │  │ Trading Bot │ │  Analytics  │ │ Mobile App  │ │  Migration  │       │ │
│  │  │    v1       │ │   Portal    │ │   v2        │ │   AWS       │       │ │
│  │  ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤       │ │
│  │  │ 🟢 HEALTHY  │ │ 🟡 AT RISK  │ │ 🟢 HEALTHY  │ │ 🔴 BLOCKED  │       │ │
│  │  │ High Prio   │ │ Med Prio    │ │ Low Prio    │ │ High Prio   │       │ │
│  │  │ Stage: Exec │ │ Stage: Plan │ │ Stage: Exec │ │ Stage: Plan │       │ │
│  │  │ Deadline:   │ │ Deadline:   │ │ Deadline:   │ │ Deadline:   │       │ │
│  │  │ 14 days     │ │ 45 days     │ │ 30 days     │ │ 7 days ⚠️   │       │ │
│  │  │ Load: ████░ │ │ Load: ██░░░ │ │ Load: █████ │ │ Load: ░░░░░ │       │ │
│  │  │ Blocked: 1  │ │ Blocked: 0  │ │ Blocked: 0  │ │ Blocked: 2  │       │ │
│  │  │ Budget: 60% │ │ Budget: 20% │ │ Budget: 80% │ │ Budget: 10% │       │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  2) PROJECT COCKPIT (Trading Bot v1)                                    │ │
│  │                                                                         │ │
│  │  ┌──────────────────┐ ┌──────────────────────────────────────────────┐  │ │
│  │  │ OBJECTIVES       │ │ MILESTONE TIMELINE                           │  │ │
│  │  │ • Ship MVP       │ │ [Done] Strategy ──[Exec] Build──[Plan] Deploy│  │ │
│  │  • Paper trade +5% │ │      ✓              ▶           ⏸            │  │ │
│  │  • Max drawdown 5% │ │                                              │  │ │
│  │  • Latency <100ms  │ │ LIVE TASK GRAPH:                             │  │ │
│  │                  │ │ ┌─────┐    ┌─────┐    ┌─────┐                  │  │ │
│  │  RISKS:          │ │ │ 2.1 │───►│ 2.2 │───►│ 2.3 │                  │  │ │
│  │  • Exchange API  │ │ │▶    │    │⏸    │    │⏸    │                  │  │ │
│  │    rate limits   │ │ └─────┘    └─────┘    └─────┘                  │  │ │
│  │  • Backtest      │ │   (claw-   (claw-   (claw-                     │  │ │
│  │    overfitting   │ │   builder) trader)  builder)                   │  │ │
│  │                  │ └──────────────────────────────────────────────┘  │ │
│  │  DECISIONS:      │                                                   │ │
│  │  • Use Binance   │ ┌──────────────────────────────────────────────┐  │ │
│  │    (3/23)        │ │ BLOCKER LIST                                 │  │ │
│  │  • Mean reversion│ │ • Task 2.3: Waiting for exchange creds       │  │ │
│  │    strategy      │ │ • Task 2.4: Waiting for strategy completion  │  │ │
│  │    approved      │ └──────────────────────────────────────────────┘  │ │
│  │                  │                                                   │ │
│  │  AGENT ACTIONS:  │ ┌──────────────────────────────────────────────┐  │ │
│  │  • 10:23 claw-   │ │ ARTIFACTS                                    │  │ │
│  │    trader: Pushed│ │ • Strategy Spec v2 (doc)                     │  │ │
│  │    backtest      │ │ • Exchange Connector PR #12 (github)         │  │ │
│  │  • 10:15 claw-   │ │ • Risk Model spreadsheet                     │  │ │
│  │    builder:      │ └──────────────────────────────────────────────┘  │ │
│  │    Started 2.1   │                                                   │ │
│  │                  │                                                   │ │
│  └──────────────────┘                                                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  3) AGENT OPERATIONS BOARD                                              │ │
│  │                                                                         │ │
│  │  AGENT        STATUS   LOAD   ACTIVE TASKS   SUCCESS   FAIL   STUCK    │ │
│  │  ─────────────────────────────────────────────────────────────────────  │ │
│  │  @claw-captain  🟢      40%    2 assigned    95%       2      0        │ │
│  │  @claw-trader   🟢      75%    3 assigned    88%       5      1        │ │
│  │  @claw-builder  🟢      60%    2 assigned    92%       3      0        │ │
│  │  @claw-ops      🟡      30%    1 assigned    98%       1      0        │ │
│  │  @claw-guard    🟢      20%    1 assigned    100%      0      0        │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  4) APPROVAL QUEUE                                                      │ │
│  │                                                                         │ │
│  │  ⬜ Deploy trading bot to production (Task 3.5)              [URGENT]   │ │
│  │     Requested by: @claw-ops | Risk: HIGH | Budget: $500      [APPROVE]  │ │
│  │                                                              [DENY]     │ │
│  │                                                                         │ │
│  │  ⬜ Increase position limit to $15K (Project: Trading Bot)   [NORMAL]   │ │
│  │     Requested by: @claw-trader | Risk: MEDIUM                [APPROVE]  │ │
│  │                                                              [DENY]     │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  5) INCIDENT & RECOVERY                                                 │ │
│  │                                                                         │ │
│  │  🔴 ACTIVE: Deployment rollback in progress (Project: Analytics)        │ │
│  │     Affected: 2 tasks | Root cause: Failed migration                    │ │
│  │     Recovery: @claw-ops executing rollback plan                         │ │
│  │     ETA: 15 minutes                                                     │ │
│  │                                                                         │ │
│  │  🟡 RECENT: Exchange API timeout caused 3 failed orders (resolved)      │ │
│  │     Fixed by: Retry with backoff policy                                 │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Autonomy Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WHAT AGENTS CAN/CANNOT DO                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ AGENTS CAN AUTONOMOUSLY:                                                 │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │  PICK UP WORK               │  │  CREATE SUBTASKS                        │ │
│  │  • Pull ready tasks from    │  │  • Create subtasks within scope         │ │
│  │    board                    │  │  • Define dependencies                  │ │
│  │  • Self-assign when         │  │  • Attach to parent task                │ │
│  │    qualified                │  │                                         │ │
│  └─────────────────────────────┘  └─────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │  UPDATE STATUS              │  │  ATTACH ARTIFACTS                       │ │
│  │  • Mark task running        │  │  • Link PRs, docs, designs              │ │
│  │  • Report progress          │  │  • Upload test results                  │ │
│  │  • Flag blockers            │  │  • Reference decisions                  │ │
│  └─────────────────────────────┘  └─────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │  REQUEST DEPENDENCIES       │  │  RETRY WITHIN POLICY                    │ │
│  │  • Request missing          │  │  • Retry failed tasks (within limit)    │ │
│  │    artifacts                │  │  • Escalate if retries exhausted        │ │
│  │  • Ask for clarification    │  │  • Propose alternative approach         │ │
│  └─────────────────────────────┘  └─────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │  PROPOSE RE-PLANNING        │  │  SUGGEST IMPROVEMENTS                   │ │
│  │  • Recommend scope changes  │  │  • Identify optimization                │ │
│  │  • Propose new milestones   │  │  • Suggest tool upgrades                │ │
│  │  • Request deadline         │  │  • Flag technical debt                  │ │
│  │    extension                │  │                                         │ │
│  └─────────────────────────────┘  └─────────────────────────────────────────┘ │
│                                                                              │
│  ❌ AGENTS CANNOT AUTONOMOUSLY:                                              │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │  CHANGE PROJECT GOALS       │  │  BYPASS DEPENDENCY GATES                │ │
│  │  • Modify charter           │  │  • Skip required tasks                  │ │
│  │  • Alter success metrics    │  │  • Jump states in machine               │ │
│  │  • Re-scope without         │  │  • Deploy without validation            │ │
│  │    approval                 │  │                                         │ │
│  └─────────────────────────────┘  └─────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │  DEPLOY TO PRODUCTION       │  │  EXCEED BUDGET/RISK THRESHOLDS          │ │
│  │  Without human approval     │  │  • Spend beyond allocation              │ │
│  │                             │  │  • Trade beyond risk limits             │ │
│  │                             │  │  • Access restricted tools              │ │
│  └─────────────────────────────┘  └─────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │  ALTER SECURITY POLICIES    │  │  DELETE AUDIT RECORDS                   │ │
│  │  • Modify validation rules  │  │  • Hide actions                         │ │
│  │  • Change approval gates    │  │  • Tamper with logs                     │ │
│  │  • Grant tool access        │  │  • Modify decision history              │ │
│  └─────────────────────────────┘  └─────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  MERGE CRITICAL CHANGES WITHOUT VALIDATION                              │ │
│  │  • Main branch merges require @claw-guard approval                      │ │
│  │  • Trading code changes require security scan                           │ │
│  │  • Infrastructure changes require @claw-ops + human review              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## MVP Scope

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: MVP (Start Here)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ INCLUDE IN MVP:                                                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  CORE PLATFORM                                                          │ │
│  │  ├─ Portfolio dashboard (project list with health)                      │ │
│  │  ├─ Per-project control tower (milestones, state tracking)              │ │
│  │  ├─ Typed task board with strict state machine                          │ │
│  │  └─ Agent dispatcher with basic scoring                                 │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  CONTROL SYSTEMS                                                        │ │
│  │  ├─ Dependency/blocker engine                                           │ │
│  │  ├─ Approval queue for human gates                                      │ │
│  │  ├─ Validation gates (basic acceptance criteria checks)                 │ │
│  │  └─ Audit/event log (immutable, searchable)                             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  INTEGRATIONS                                                           │ │
│  │  ├─ Discord notifications                                               │ │
│  │  ├─ GitHub PR linking                                                   │ │
│  │  └─ Agent heartbeat/status updates                                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ❌ DEFER TO PHASE 2:                                                        │
│                                                                              │
│  • Advanced forecasting (AI-powered predictions)                             │
│  • Self-optimizing scheduling (ML-based dispatch)                            │
│  • Cross-project resource optimization                                       │
│  • Advanced risk modeling                                                    │
│  • Natural language project creation                                         │
│  • Automated code review agents                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## One-Line Design Principle

> **Mission Control acts like an autonomous chief of staff: always planning, always dispatching, always verifying, and never letting agents operate outside policy.**
