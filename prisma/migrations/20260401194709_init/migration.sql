-- CreateEnum
CREATE TYPE "ProjectState" AS ENUM ('PROPOSED', 'APPROVED', 'PLANNING', 'EXECUTING', 'BLOCKED', 'AWAITING_REVIEW', 'DEPLOYING', 'MONITORING', 'COMPLETED', 'ROLLBACK', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MilestoneState" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FEATURE', 'BUG', 'TRADING_STRATEGY', 'INFRASTRUCTURE', 'SECURITY', 'RESEARCH', 'DOCUMENTATION', 'DEPLOYMENT', 'ANALYSIS', 'COORDINATION', 'TESTING', 'CODE_REVIEW');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('QUEUED', 'READY', 'ASSIGNED', 'RUNNING', 'AWAITING_DEPENDENCY', 'AWAITING_VALIDATION', 'BLOCKED', 'FAILED', 'COMPLETE', 'CANCELED');

-- CreateEnum
CREATE TYPE "BlockerType" AS ENUM ('DEPENDENCY_UNMET', 'HUMAN_APPROVAL_PENDING', 'MISSING_CREDENTIALS', 'FAILING_TESTS', 'INFRA_UNAVAILABLE', 'AMBIGUOUS_REQUIREMENTS', 'RISK_THRESHOLD_EXCEEDED', 'EXTERNAL_DEPENDENCY', 'RESOURCE_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "CommentAuthorType" AS ENUM ('AGENT', 'HUMAN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AgentRole" AS ENUM ('COORDINATOR', 'TRADING_LEAD', 'FULLSTACK_DEV', 'INFRASTRUCTURE', 'SECURITY_QA', 'RESEARCHER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ONLINE', 'BUSY', 'AWAY', 'OFFLINE', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('TASK_CREATED', 'TASK_ASSIGNED', 'TASK_STARTED', 'TASK_COMPLETED', 'TASK_BLOCKED', 'TASK_FAILED', 'TASK_RETRY', 'CODE_PUSHED', 'PR_OPENED', 'PR_MERGED', 'PR_REVIEWED', 'DEPLOYMENT_STARTED', 'DEPLOYMENT_COMPLETED', 'DEPLOYMENT_FAILED', 'TRADE_EXECUTED', 'TRADE_CLOSED', 'TRADE_FAILED', 'ALERT_TRIGGERED', 'MESSAGE_SENT', 'ERROR_OCCURRED', 'DECISION_MADE', 'ESCALATION_TRIGGERED', 'BLOCKER_RESOLVED');

-- CreateEnum
CREATE TYPE "PositionSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('OPEN', 'CLOSED', 'LIQUIDATED', 'STOPPED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT', 'TRAILING_STOP');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "DecisionState" AS ENUM ('PROPOSED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'IMPLEMENTED');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('TECHNICAL', 'SCHEDULE', 'BUDGET', 'SECURITY', 'LEGAL', 'EXTERNAL', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('IDENTIFIED', 'ASSESSING', 'MITIGATING', 'MONITORING', 'ACCEPTED', 'RESOLVED', 'REALIZED');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('SPECIFICATION', 'DESIGN', 'CODE', 'PR', 'DEPLOYMENT', 'TEST_RESULT', 'DOCUMENTATION', 'REPORT', 'DATA_EXPORT', 'DECISION_RECORD', 'CONFIGURATION');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('AGENT', 'HUMAN', 'SYSTEM', 'WEBHOOK', 'SCHEDULER');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'SECURITY');

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "strategy" TEXT,
    "budgetTotal" DECIMAL(12,2),
    "budgetUsed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priorities" JSONB,
    "capacityRules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "charter" TEXT,
    "description" TEXT,
    "objectives" JSONB,
    "successMetrics" JSONB,
    "state" "ProjectState" NOT NULL DEFAULT 'PROPOSED',
    "stateHistory" JSONB,
    "milestoneGraph" JSONB,
    "plannedStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "budgetAllocated" DECIMAL(12,2),
    "budgetSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "effortEstimated" DOUBLE PRECISION,
    "effortActual" DOUBLE PRECISION,
    "memory" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dependencies" TEXT[],
    "state" "MilestoneState" NOT NULL DEFAULT 'PLANNED',
    "plannedDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "acceptanceCriteria" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "status" "TaskStatus" NOT NULL DEFAULT 'QUEUED',
    "statusHistory" JSONB,
    "dependencies" TEXT[],
    "dependents" TEXT[],
    "requiredRole" TEXT,
    "assigneeId" TEXT,
    "requiredTools" TEXT[],
    "estimatedEffort" DOUBLE PRECISION,
    "actualEffort" DOUBLE PRECISION,
    "queuedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "outputs" JSONB,
    "validationCriteria" JSONB,
    "actualOutputs" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryRules" JSONB,
    "escalationPolicy" JSONB,
    "blockerType" "BlockerType",
    "blockerReason" TEXT,
    "blockerResolvedAt" TIMESTAMP(3),
    "blockerResolution" TEXT,
    "discordThreadUrl" TEXT,
    "githubPrUrl" TEXT,
    "githubIssueUrl" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_logs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorType" "CommentAuthorType" NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 's3',
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AgentRole" NOT NULL,
    "avatar" TEXT,
    "model" TEXT NOT NULL,
    "apiKeyRef" TEXT NOT NULL,
    "apiKeyHash" TEXT,
    "capabilities" TEXT[],
    "trustLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "costPerHour" DECIMAL(10,2),
    "status" "AgentStatus" NOT NULL DEFAULT 'OFFLINE',
    "currentLoad" INTEGER NOT NULL DEFAULT 0,
    "maxLoad" INTEGER NOT NULL DEFAULT 3,
    "performanceStats" JSONB,
    "dailyTaskLimit" INTEGER NOT NULL DEFAULT 10,
    "tasksToday" INTEGER NOT NULL DEFAULT 0,
    "lastTaskDate" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "lastIpAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_heartbeats" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpuUsage" DOUBLE PRECISION,
    "memoryUsage" DOUBLE PRECISION,
    "activeTaskCount" INTEGER NOT NULL DEFAULT 0,
    "networkLatency" DOUBLE PRECISION,
    "diskUsage" DOUBLE PRECISION,
    "metadata" JSONB,

    CONSTRAINT "agent_heartbeats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_activities" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "taskId" TEXT,
    "projectId" TEXT,
    "metadata" JSONB,
    "durationMs" INTEGER,
    "success" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_configs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "maxPositionSize" DECIMAL(16,8),
    "maxDailyLoss" DECIMAL(10,2),
    "maxDrawdown" DOUBLE PRECISION,
    "maxOrdersPerMinute" INTEGER NOT NULL DEFAULT 10,
    "maxOpenPositions" INTEGER NOT NULL DEFAULT 5,
    "maxLeverage" INTEGER NOT NULL DEFAULT 3,
    "canTradeLive" BOOLEAN NOT NULL DEFAULT false,
    "canTradePaper" BOOLEAN NOT NULL DEFAULT true,
    "allowedExchanges" TEXT[],
    "allowedPairs" TEXT[],
    "restrictedHours" JSONB,
    "killSwitchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastKillSwitchAt" TIMESTAMP(3),
    "killSwitchReason" TEXT,
    "dailyLossLimit" DECIMAL(10,2),
    "dailyLossCurrent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "projectId" TEXT,
    "exchange" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "PositionSide" NOT NULL,
    "entryPrice" DECIMAL(16,8) NOT NULL,
    "size" DECIMAL(16,8) NOT NULL,
    "leverage" INTEGER NOT NULL DEFAULT 1,
    "unrealizedPnl" DECIMAL(16,8),
    "realizedPnl" DECIMAL(16,8),
    "pnlPercent" DOUBLE PRECISION,
    "stopLoss" DECIMAL(16,8),
    "takeProfit" DECIMAL(16,8),
    "status" "PositionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "strategyId" TEXT,
    "taskId" TEXT,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "positionId" TEXT,
    "agentId" TEXT NOT NULL,
    "projectId" TEXT,
    "exchange" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "externalId" TEXT,
    "side" "OrderSide" NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "size" DECIMAL(16,8) NOT NULL,
    "price" DECIMAL(16,8),
    "executedSize" DECIMAL(16,8),
    "executedPrice" DECIMAL(16,8),
    "fees" DECIMAL(16,8),
    "strategyId" TEXT,
    "taskId" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "authorType" "CommentAuthorType" NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "requiredApprovals" INTEGER NOT NULL DEFAULT 0,
    "currentApprovals" INTEGER NOT NULL DEFAULT 0,
    "approvals" JSONB,
    "state" "DecisionState" NOT NULL DEFAULT 'PROPOSED',
    "relatedTaskIds" TEXT[],
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL DEFAULT 'TECHNICAL',
    "likelihood" "RiskLevel" NOT NULL,
    "impact" "RiskLevel" NOT NULL,
    "score" INTEGER NOT NULL,
    "mitigation" TEXT,
    "contingency" TEXT,
    "owner" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "identifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "type" "ArtifactType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "githubRepo" TEXT,
    "githubPr" TEXT,
    "githubCommit" TEXT,
    "environment" TEXT,
    "version" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "validationResult" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "eventTypes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_checks" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseTime" INTEGER,
    "message" TEXT,
    "details" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "taskId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_slug_key" ON "portfolios"("slug");

-- CreateIndex
CREATE INDEX "portfolios_isActive_idx" ON "portfolios"("isActive");

-- CreateIndex
CREATE INDEX "portfolios_slug_idx" ON "portfolios"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_portfolioId_state_isArchived_idx" ON "projects"("portfolioId", "state", "isArchived");

-- CreateIndex
CREATE INDEX "projects_state_idx" ON "projects"("state");

-- CreateIndex
CREATE INDEX "projects_slug_idx" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_plannedEnd_idx" ON "projects"("plannedEnd");

-- CreateIndex
CREATE INDEX "milestones_projectId_state_idx" ON "milestones"("projectId", "state");

-- CreateIndex
CREATE INDEX "milestones_state_idx" ON "milestones"("state");

-- CreateIndex
CREATE INDEX "milestones_plannedDate_idx" ON "milestones"("plannedDate");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_projectId_slug_key" ON "milestones"("projectId", "slug");

-- CreateIndex
CREATE INDEX "tasks_projectId_status_priority_idx" ON "tasks"("projectId", "status", "priority");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_status_idx" ON "tasks"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "tasks_milestoneId_status_idx" ON "tasks"("milestoneId", "status");

-- CreateIndex
CREATE INDEX "tasks_status_blockerType_idx" ON "tasks"("status", "blockerType");

-- CreateIndex
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");

-- CreateIndex
CREATE INDEX "tasks_isDeleted_idx" ON "tasks"("isDeleted");

-- CreateIndex
CREATE INDEX "tasks_type_status_idx" ON "tasks"("type", "status");

-- CreateIndex
CREATE INDEX "time_logs_taskId_startedAt_idx" ON "time_logs"("taskId", "startedAt");

-- CreateIndex
CREATE INDEX "time_logs_agentId_idx" ON "time_logs"("agentId");

-- CreateIndex
CREATE INDEX "task_comments_taskId_createdAt_idx" ON "task_comments"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "attachments_taskId_idx" ON "attachments"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "agents_handle_key" ON "agents"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "agents_apiKeyRef_key" ON "agents"("apiKeyRef");

-- CreateIndex
CREATE INDEX "agents_status_idx" ON "agents"("status");

-- CreateIndex
CREATE INDEX "agents_role_idx" ON "agents"("role");

-- CreateIndex
CREATE INDEX "agents_handle_idx" ON "agents"("handle");

-- CreateIndex
CREATE INDEX "agents_apiKeyRef_idx" ON "agents"("apiKeyRef");

-- CreateIndex
CREATE INDEX "agent_heartbeats_agentId_timestamp_idx" ON "agent_heartbeats"("agentId", "timestamp");

-- CreateIndex
CREATE INDEX "agent_activities_agentId_createdAt_idx" ON "agent_activities"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_activities_type_idx" ON "agent_activities"("type");

-- CreateIndex
CREATE INDEX "agent_activities_projectId_idx" ON "agent_activities"("projectId");

-- CreateIndex
CREATE INDEX "agent_activities_createdAt_idx" ON "agent_activities"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "trading_configs_agentId_key" ON "trading_configs"("agentId");

-- CreateIndex
CREATE INDEX "positions_agentId_status_idx" ON "positions"("agentId", "status");

-- CreateIndex
CREATE INDEX "positions_symbol_status_idx" ON "positions"("symbol", "status");

-- CreateIndex
CREATE INDEX "positions_projectId_idx" ON "positions"("projectId");

-- CreateIndex
CREATE INDEX "positions_openedAt_idx" ON "positions"("openedAt");

-- CreateIndex
CREATE INDEX "orders_agentId_status_idx" ON "orders"("agentId", "status");

-- CreateIndex
CREATE INDEX "orders_projectId_idx" ON "orders"("projectId");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_exchange_externalId_idx" ON "orders"("exchange", "externalId");

-- CreateIndex
CREATE INDEX "decisions_projectId_state_idx" ON "decisions"("projectId", "state");

-- CreateIndex
CREATE INDEX "decisions_state_idx" ON "decisions"("state");

-- CreateIndex
CREATE INDEX "decisions_createdAt_idx" ON "decisions"("createdAt");

-- CreateIndex
CREATE INDEX "risks_projectId_status_idx" ON "risks"("projectId", "status");

-- CreateIndex
CREATE INDEX "risks_score_idx" ON "risks"("score");

-- CreateIndex
CREATE INDEX "risks_category_idx" ON "risks"("category");

-- CreateIndex
CREATE INDEX "artifacts_projectId_type_idx" ON "artifacts"("projectId", "type");

-- CreateIndex
CREATE INDEX "artifacts_taskId_idx" ON "artifacts"("taskId");

-- CreateIndex
CREATE INDEX "artifacts_createdAt_idx" ON "artifacts"("createdAt");

-- CreateIndex
CREATE INDEX "artifacts_type_validated_idx" ON "artifacts"("type", "validated");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_actorId_idx" ON "audit_logs"("timestamp", "actorId");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "system_config_category_idx" ON "system_config"("category");

-- CreateIndex
CREATE INDEX "webhooks_isActive_idx" ON "webhooks"("isActive");

-- CreateIndex
CREATE INDEX "events_aggregateType_aggregateId_idx" ON "events"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");

-- CreateIndex
CREATE INDEX "events_timestamp_idx" ON "events"("timestamp");

-- CreateIndex
CREATE INDEX "events_aggregateType_timestamp_idx" ON "events"("aggregateType", "timestamp");

-- CreateIndex
CREATE INDEX "health_checks_service_checkedAt_idx" ON "health_checks"("service", "checkedAt");

-- CreateIndex
CREATE INDEX "health_checks_status_idx" ON "health_checks"("status");

-- CreateIndex
CREATE INDEX "notifications_recipientId_readAt_idx" ON "notifications"("recipientId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_heartbeats" ADD CONSTRAINT "agent_heartbeats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_activities" ADD CONSTRAINT "agent_activities_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_configs" ADD CONSTRAINT "trading_configs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
