# Agent Work Guide for Mission Control

**Purpose:** Instructions for sub-agents working on Mission Control fixes

---

## BEFORE YOU START

### 1. Read the Documentation

**REQUIRED READING ORDER:**

1. \`PROJECT_SPECIFICATION.md\` - Start here. Read the entire thing.
2. \`docs/TYPESCRIPT_ERROR_FIXES.md\` - Know the common errors
3. Component docs for your assigned area:
   - Working on tasks? Read \`TASK_STATE_MACHINE.md\`
   - Working on API routes? Read \`API_ROUTES.md\`
   - Working on hooks? Read \`REACT_QUERY_HOOKS.md\`
   - Working on services? Read \`SERVICE_PATTERN.md\`

### 2. Understand the Current State

\`\`\`bash
# Check current TypeScript errors
npm run build 2>&1 | grep -E "(error TS|✖)" | head -20

# Or run type check only
npx tsc --noEmit 2>&1 | head -50
\`\`\`

### 3. Identify Your Fix Scope

Each agent should have a specific scope:
- **Agent 1:** Fix API route status value errors ("DONE" → "COMPLETE")
- **Agent 2:** Fix React Query hook type mismatches
- **Agent 3:** Fix service layer return types
- **Agent 4:** Fix component prop types

---

## WORK PROCESS

### Step 1: Find Files to Fix

\`\`\`bash
# Find files with specific errors
grep -r "DONE" src/app/api --include="*.ts" | grep -v "node_modules"
grep -r "status:" src/hooks --include="*.ts" | head -20
\`\`\`

### Step 2: Make the Fix

**CRITICAL RULES:**

1. **NEVER bypass the state machine** - All status changes go through TaskStateMachine
2. **ALWAYS use Result<T, Error>** - No exceptions
3. **ALWAYS filter isDeleted: false** - Every Prisma query
4. **ALWAYS use correct enum values** - Check PROJECT_SPECIFICATION.md

### Step 3: Test the Fix

\`\`\`bash
# Run type check on just your file
npx tsc --noEmit src/app/api/tasks/route.ts

# Run full type check
npx tsc --noEmit 2>&1 | grep error | wc -l

# Should see count decrease
\`\`\`

### Step 4: Update Documentation (REQUIRED)

**THIS IS MANDATORY. NO EXCEPTIONS.**

After every fix, update the relevant documentation:

| If you fixed... | Update this doc... | What to add... |
|-----------------|-------------------|----------------|
| Enum values | \`PROJECT_SPECIFICATION.md\` | Clarify correct values |
| API route pattern | \`docs/components/API_ROUTES.md\` | New pattern/example |
| Hook types | \`docs/components/REACT_QUERY_HOOKS.md\` | Type fix example |
| Service method | \`docs/components/SERVICE_PATTERN.md\` | Updated pattern |
| State machine | \`docs/components/TASK_STATE_MACHINE.md\` | Guard clarification |
| TypeScript error | \`docs/TYPESCRIPT_ERROR_FIXES.md\` | New error + fix |

**How to update docs:**

\`\`\`bash
# Read the current doc
cat docs/components/API_ROUTES.md

# Edit the doc with your fix
cat >> docs/components/API_ROUTES.md << 'EOF'

## Fix Applied: [Date] by [Agent]

### Problem
[Describe the error you fixed]

### Solution
[Show the pattern you used]

### Example
\`\`\`typescript
// Fixed code here
\`\`\`
EOF
\`\`\`

---

## DOCUMENTATION UPDATE TEMPLATE

When you fix something, add this to the relevant doc:

\`\`\`markdown
## Fix Log: YYYY-MM-DD

**Agent:** [Your identifier]  
**Issue:** [Brief description]  
**Files Modified:** [List files]

### Problem
[Describe the error]

### Solution Applied
[Describe your fix]

### Code Changes
\`\`\`typescript
// Before (wrong)
[bad code]

// After (correct)
[good code]
\`\`\`

### Documentation Updated
- [ ] PROJECT_SPECIFICATION.md
- [ ] API_ROUTES.md / HOOKS.md / SERVICE_PATTERN.md / etc.
- [ ] TYPESCRIPT_ERROR_FIXES.md (if new error type)
\`\`\`

---

## VERIFICATION CHECKLIST

Before marking your task complete:

- [ ] TypeScript errors reduced (run \`npx tsc --noEmit\`)
- [ ] Code follows PROJECT_SPECIFICATION.md patterns
- [ ] All service methods return Result<T, Error>
- [ ] All Prisma queries filter isDeleted: false
- [ ] All enum values match specification
- [ ] Documentation updated with fix details
- [ ] No "any" types added
- [ ] No direct status mutations (use state machine)

---

## COMMON MISTAKES TO AVOID

### ❌ DON'T

\`\`\`typescript
// Don't use wrong status values
if (task.status === 'DONE')  // ❌
if (task.status === 'COMPLETE')  // ✅

// Don't return raw data from services
return task;  // ❌
return Result.ok(task);  // ✅

// Don't forget soft delete filter
await prisma.task.findMany({ where: { status } });  // ❌
await prisma.task.findMany({ where: { status, isDeleted: false } });  // ✅

// Don't change status directly
await prisma.task.update({ data: { status: 'RUNNING' } });  // ❌
// Use state machine + service method
await taskService.updateTask(id, { status: 'RUNNING' }, actorId, actorHandle);  // ✅

// Don't skip docs update
// "I'll update docs later"  // ❌
// Update docs immediately after fix  // ✅
\`\`\`

---

## COMMUNICATION

### Status Updates

After each fix, report:

\`\`\`
[Agent Name] - Fix Complete
- File: src/app/api/tasks/route.ts
- Errors fixed: 3
- Remaining errors in file: 0
- Total remaining errors: ~180
- Docs updated: API_ROUTES.md
\`\`\`

### Blockers

If you're blocked:

1. Check PROJECT_SPECIFICATION.md
2. Check component-specific docs
3. Ask for clarification with specific error message

**Good blocker question:**
\`\`\`
Blocked on TaskService.updateTask
Error: "Type 'string' is not assignable to type 'TaskStatus'"
File: src/services/task.service.ts:145
Related doc: PROJECT_SPECIFICATION.md section "State Machines"
Question: Should I cast the string or validate it against the enum?
\`\`\`

---

## SUCCESS METRICS

Track these as you work:

| Metric | Target |
|--------|--------|
| TypeScript errors | 205 → 0 |
| "DONE" usage | All replaced with "COMPLETE" |
| Result types | All service methods return Result |
| isDeleted filters | 100% of queries |
| Doc updates | 1 per fix |

---

## FINAL CHECK BEFORE SUBMITTING

\`\`\`bash
# 1. Run type check
npx tsc --noEmit

# 2. Count remaining errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# 3. Check for "DONE" usage
grep -r "['\"]DONE['\"]" src --include="*.ts" | wc -l

# 4. Check for missing isDeleted filters
grep -r "findMany" src/services --include="*.ts" | grep -v "isDeleted" | wc -l

# 5. Verify docs updated
git diff docs/
\`\`\`

---

## REMEMBER

**Every fix must include a documentation update.**

Future agents depend on accurate documentation. Your fix is only complete when the docs reflect the current state.

**Documentation is code. Treat it with the same care.**

