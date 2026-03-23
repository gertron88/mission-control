import { PrismaClient, AgentRole, TaskType, TaskPriority, TaskStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')
  
  // Create agents
  const agents = await Promise.all([
    prisma.agent.create({
      data: {
        handle: '@claw-captain',
        name: 'Captain',
        role: AgentRole.COORDINATOR,
        model: 'kimi-coding/k2p5',
        apiKeyRef: 'kimi_key_1',
        capabilities: ['planning', 'delegation', 'conflict_resolution', 'human_interface'],
        status: 'ONLINE',
      },
    }),
    prisma.agent.create({
      data: {
        handle: '@claw-trader',
        name: 'Trader',
        role: AgentRole.TRADING_LEAD,
        model: 'kimi-coding/k2p5',
        apiKeyRef: 'kimi_key_2',
        capabilities: ['strategy_dev', 'execution', 'risk_management', 'market_analysis'],
        status: 'ONLINE',
        tradingConfig: {
          create: {
            maxPositionSize: 10000,
            maxDailyLoss: 1000,
            maxDrawdown: 10,
            canTradeLive: false,
            canTradePaper: true,
            allowedExchanges: ['binance', 'coinbase'],
            allowedPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
          },
        },
      },
    }),
    prisma.agent.create({
      data: {
        handle: '@claw-builder',
        name: 'Builder',
        role: AgentRole.FULLSTACK_DEV,
        model: 'kimi-coding/k2p5',
        apiKeyRef: 'kimi_key_3',
        capabilities: ['frontend', 'backend', 'database', 'api_design'],
        status: 'ONLINE',
      },
    }),
    prisma.agent.create({
      data: {
        handle: '@claw-ops',
        name: 'Ops',
        role: AgentRole.INFRASTRUCTURE,
        model: 'kimi-coding/k2p5',
        apiKeyRef: 'kimi_key_4',
        capabilities: ['cicd', 'deployment', 'monitoring', 'cloud', 'terraform'],
        status: 'ONLINE',
      },
    }),
    prisma.agent.create({
      data: {
        handle: '@claw-guard',
        name: 'Guard',
        role: AgentRole.SECURITY_QA,
        model: 'kimi-coding/k2p5',
        apiKeyRef: 'kimi_key_5',
        capabilities: ['security_scan', 'code_review', 'testing', 'compliance'],
        status: 'ONLINE',
      },
    }),
  ])
  
  console.log(`✅ Created ${agents.length} agents`)
  
  // Create sample tasks
  const captain = agents.find(a => a.handle === '@claw-captain')!
  
  await Promise.all([
    prisma.task.create({
      data: {
        title: 'Design ETH/USDT trading strategy',
        description: 'Research and design a mean reversion strategy for ETH/USDT pair. Include backtesting plan and risk parameters.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        type: TaskType.TRADING_STRATEGY,
        assigneeId: agents.find(a => a.handle === '@claw-trader')!.id,
        creatorId: captain.id,
        project: 'trading-bot-v1',
        estimatedHours: 8,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Build Mission Control dashboard',
        description: 'Create the main dashboard with task board, agent status, and trading overview.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        type: TaskType.FEATURE,
        assigneeId: agents.find(a => a.handle === '@claw-builder')!.id,
        creatorId: captain.id,
        project: 'mission-control',
        estimatedHours: 12,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Setup AWS infrastructure',
        description: 'Provision VPC, ECS cluster, and database for production deployment.',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        type: TaskType.INFRASTRUCTURE,
        assigneeId: agents.find(a => a.handle === '@claw-ops')!.id,
        creatorId: captain.id,
        project: 'infrastructure',
        estimatedHours: 6,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Security audit of exchange connectors',
        description: 'Review API key handling, request signing, and error handling in exchange integration code.',
        status: TaskStatus.BACKLOG,
        priority: TaskPriority.HIGH,
        type: TaskType.SECURITY,
        assigneeId: agents.find(a => a.handle === '@claw-guard')!.id,
        creatorId: captain.id,
        project: 'security-review',
        estimatedHours: 4,
      },
    }),
  ])
  
  console.log('✅ Created sample tasks')
  
  // Create system config
  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'trading_enabled',
        value: true,
        description: 'Global trading enable/disable',
      },
      {
        key: 'default_risk_limits',
        value: {
          maxPositionSize: 5000,
          maxDailyLoss: 500,
          maxOrdersPerMinute: 10,
        },
        description: 'Default risk limits for new trading agents',
      },
      {
        key: 'discord_notifications',
        value: {
          task_created: true,
          task_completed: true,
          trade_executed: true,
          kill_switch: true,
        },
        description: 'Discord notification settings',
      },
    ],
  })
  
  console.log('✅ Created system config')
  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
