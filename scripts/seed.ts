import { PrismaClient, ProjectState, MilestoneState, TaskStatus, TaskType, TaskPriority, AgentRole, AgentStatus, DecisionState, RiskStatus, RiskLevel, ArtifactType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Mission Control database...')
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE PORTFOLIO
  // ─────────────────────────────────────────────────────────────────────────────
  
  const portfolio = await prisma.portfolio.create({
    data: {
      name: 'Q2 2026 AI Trading Initiative',
      description: 'Autonomous trading systems and supporting infrastructure',
      strategy: 'Build production-ready trading bots with full observability and risk controls',
      budgetTotal: 50000.00,
      priorities: {
        trading_bots: 'high',
        infrastructure: 'high',
        analytics: 'medium',
        documentation: 'low'
      },
      capacityRules: {
        claw_trader_max_tasks: 3,
        claw_builder_max_tasks: 2,
        cross_project_limit: 5
      }
    }
  })
  
  console.log(`✅ Created portfolio: ${portfolio.name}`)
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE AGENTS
  // ─────────────────────────────────────────────────────────────────────────────
  
  const agents = await Promise.all([
    prisma.agent.create({
      data: {
        handle: '@claw-captain',
        name: 'Captain',
        role: AgentRole.COORDINATOR,
        model: 'kimi-coding/k2p5',
        apiKeyRef: 'kimi_key_1',
        capabilities: ['planning', 'delegation', 'conflict_resolution', 'human_interface', 'project_management'],
        trustLevel: 0.95,
        maxLoad: 5,
        status: AgentStatus.ONLINE,
        performanceStats: {
          tasks_completed: 47,
          tasks_failed: 2,
          success_rate: 0.96,
          avg_task_duration_hours: 3.2
        }
      },
    }),
    prisma.agent.create({
      data: {
        handle: '@claw-trader',
        name: 'Trader',
        role: AgentRole.TRADING_LEAD,
        model: 'kimi-coding/k2p5',
        apiKeyRef: 'kimi_key_2',
        capabilities: ['strategy_dev', 'execution', 'risk_management', 'market_analysis', 'backtesting'],
        trustLevel: 0.85,
        maxLoad: 3,
        status: AgentStatus.ONLINE,
        performanceStats: {
          tasks_completed: 32,
          tasks_failed: 4,
          success_rate: 0.89,
          avg_task_duration_hours: 4.5
        },
        tradingConfig: {
          create: {
            maxPositionSize: 10000.00,
            maxDailyLoss: 1000.00,
            maxDrawdown: 10.0,
            maxOrdersPerMinute: 10,
            maxOpenPositions: 3,
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
        capabilities: ['frontend', 'backend', 'database', 'api_design', 'react', 'node', 'python'],
        trustLevel: 0.90,
        maxLoad: 3,
        status: AgentStatus.ONLINE,
        performanceStats: {
          tasks_completed: 56,
          tasks_failed: 3,
          success_rate: 0.95,
          avg_task_duration_hours: 2.8
        }
      },
    }),
    prisma.agent.create({
      data: {
        handle: '@claw-ops',
        name: 'Ops',
        role: AgentRole.INFRASTRUCTURE,
        model: 'kimi-coding/k2p5',
        apiKeyRef: 'kimi_key_4',
        capabilities: ['cicd', 'deployment', 'monitoring', 'cloud', 'terraform', 'docker', 'kubernetes'],
        trustLevel: 0.92,
        maxLoad: 4,
        status: AgentStatus.ONLINE,
        performanceStats: {
          tasks_completed: 38,
          tasks_failed: 1,
          success_rate: 0.97,
          avg_task_duration_hours: 2.1
        }
      },
    }),
    prisma.agent.create({
      data: {
        handle: '@claw-guard',
        name: 'Guard',
        role: AgentRole.SECURITY_QA,
        model: 'kimi-coding/k2p5',
        apiKeyRef: 'kimi_key_5',
        capabilities: ['security_scan', 'code_review', 'testing', 'compliance', 'audit'],
        trustLevel: 0.98,
        maxLoad: 4,
        status: AgentStatus.ONLINE,
        performanceStats: {
          tasks_completed: 42,
          tasks_failed: 0,
          success_rate: 1.0,
          avg_task_duration_hours: 1.5
        }
      },
    }),
  ])
  
  const [captain, trader, builder, ops, guard] = agents
  console.log(`✅ Created ${agents.length} agents`)
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE PROJECT: Trading Bot v1
  // ─────────────────────────────────────────────────────────────────────────────
  
  const tradingBotProject = await prisma.project.create({
    data: {
      portfolioId: portfolio.id,
      name: 'Trading Bot v1',
      charter: 'Build a production-ready mean reversion trading bot for crypto markets with full risk controls and monitoring.',
      description: 'Automated trading system for BTC/USDT and ETH/USDT pairs using mean reversion strategy',
      state: ProjectState.EXECUTING,
      stateHistory: [
        { state: 'PROPOSED', timestamp: new Date('2026-03-01'), reason: 'Initial proposal' },
        { state: 'APPROVED', timestamp: new Date('2026-03-05'), reason: 'Approved by stakeholders' },
        { state: 'PLANNING', timestamp: new Date('2026-03-10'), reason: 'Planning started' },
        { state: 'EXECUTING', timestamp: new Date('2026-03-20'), reason: 'Development underway' }
      ],
      objectives: [
        { objective: 'Achieve 5%+ monthly paper trading returns', target: '5%', metric: 'monthly_return' },
        { objective: 'Maintain max drawdown below 10%', target: '10%', metric: 'max_drawdown' },
        { objective: 'Execute trades with <100ms latency', target: '100ms', metric: 'latency_p99' },
        { objective: 'Pass security audit', target: '100%', metric: 'security_score' }
      ],
      successMetrics: {
        roi_target: 0.05,
        max_drawdown: 0.10,
        sharpe_ratio: 1.5,
        uptime: 0.995
      },
      milestoneGraph: {
        nodes: ['M1', 'M2', 'M3', 'M4'],
        edges: [['M1', 'M2'], ['M2', 'M3'], ['M3', 'M4']]
      },
      budgetAllocated: 15000.00,
      budgetSpent: 3500.00,
      plannedStart: new Date('2026-03-15'),
      plannedEnd: new Date('2026-04-30'),
      actualStart: new Date('2026-03-20'),
      memory: {
        key_decisions: [
          { date: '2026-03-10', decision: 'Use Binance as primary exchange', rationale: 'Lower fees, better API' },
          { date: '2026-03-15', decision: 'Mean reversion strategy selected', rationale: 'Backtested well in ranging markets' }
        ],
        known_issues: [
          { issue: 'Rate limiting on testnet', workaround: 'Implement exponential backoff' }
        ]
      }
    }
  })
  
  console.log(`✅ Created project: ${tradingBotProject.name}`)
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE MILESTONES FOR TRADING BOT
  // ─────────────────────────────────────────────────────────────────────────────
  
  const milestones = await Promise.all([
    prisma.milestone.create({
      data: {
        projectId: tradingBotProject.id,
        name: 'Strategy Design',
        description: 'Define trading strategy, risk parameters, and success criteria',
        sequence: 1,
        state: MilestoneState.COMPLETE,
        actualDate: new Date('2026-03-18'),
        plannedDate: new Date('2026-03-18'),
      }
    }),
    prisma.milestone.create({
      data: {
        projectId: tradingBotProject.id,
        name: 'MVP Development',
        description: 'Build core trading engine, exchange connectors, and basic monitoring',
        sequence: 2,
        dependencies: [],
        state: MilestoneState.IN_PROGRESS,
        plannedDate: new Date('2026-04-05'),
      }
    }),
    prisma.milestone.create({
      data: {
        projectId: tradingBotProject.id,
        name: 'Security & QA',
        description: 'Security audit, comprehensive testing, and risk validation',
        sequence: 3,
        dependencies: [],
        state: MilestoneState.PLANNED,
        plannedDate: new Date('2026-04-15'),
      }
    }),
    prisma.milestone.create({
      data: {
        projectId: tradingBotProject.id,
        name: 'Production Deployment',
        description: 'Deploy to production with monitoring and kill switches',
        sequence: 4,
        dependencies: [],
        state: MilestoneState.PLANNED,
        plannedDate: new Date('2026-04-30'),
      }
    }),
  ])
  
  const [m1, m2, m3, m4] = milestones
  console.log(`✅ Created ${milestones.length} milestones`)
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE TASKS FOR TRADING BOT
  // ─────────────────────────────────────────────────────────────────────────────
  
  // M1: Strategy Design (Complete)
  await prisma.task.create({
    data: {
      projectId: tradingBotProject.id,
      milestoneId: m1.id,
      title: 'Research mean reversion strategies',
      description: 'Analyze historical data to identify optimal entry/exit signals for mean reversion in BTC and ETH markets',
      type: TaskType.RESEARCH,
      priority: TaskPriority.HIGH,
      status: TaskStatus.COMPLETE,
      statusHistory: [
        { status: 'QUEUED', timestamp: new Date('2026-03-10'), actor: '@claw-captain' },
        { status: 'ASSIGNED', timestamp: new Date('2026-03-11'), actor: '@claw-captain' },
        { status: 'RUNNING', timestamp: new Date('2026-03-11'), actor: '@claw-trader' },
        { status: 'COMPLETE', timestamp: new Date('2026-03-13'), actor: '@claw-trader' }
      ],
      requiredRole: 'TRADING_LEAD',
      assigneeId: trader.id,
      estimatedEffort: 8,
      actualEffort: 6,
      startedAt: new Date('2026-03-11'),
      completedAt: new Date('2026-03-13'),
      validationCriteria: {
        criteria: [
          'Backtested on 1 year of data',
          'Sharpe ratio > 1.0',
          'Max drawdown < 15%'
        ]
      },
      actualOutputs: {
        artifacts: ['strategy_research_v1.pdf', 'backtest_results.csv']
      }
    }
  })
  
  await prisma.task.create({
    data: {
      projectId: tradingBotProject.id,
      milestoneId: m1.id,
      title: 'Define risk parameters',
      description: 'Establish position sizing, stop-loss levels, and daily loss limits',
      type: TaskType.TRADING_STRATEGY,
      priority: TaskPriority.CRITICAL,
      status: TaskStatus.COMPLETE,
      statusHistory: [
        { status: 'QUEUED', timestamp: new Date('2026-03-13'), actor: '@claw-captain' },
        { status: 'ASSIGNED', timestamp: new Date('2026-03-14'), actor: '@claw-captain' },
        { status: 'RUNNING', timestamp: new Date('2026-03-14'), actor: '@claw-trader' },
        { status: 'AWAITING_VALIDATION', timestamp: new Date('2026-03-15'), actor: '@claw-trader' },
        { status: 'COMPLETE', timestamp: new Date('2026-03-16'), actor: '@claw-guard' }
      ],
      requiredRole: 'TRADING_LEAD',
      assigneeId: trader.id,
      estimatedEffort: 4,
      actualEffort: 5,
      startedAt: new Date('2026-03-14'),
      completedAt: new Date('2026-03-16'),
      dependencies: [],
      validationCriteria: {
        criteria: [
          'Risk limits documented',
          '@claw-guard approved',
          'Kill switch procedures defined'
        ]
      },
      actualOutputs: {
        artifacts: ['risk_parameters_v1.json', 'kill_switch_procedures.md']
      }
    }
  })
  
  // M2: MVP Development (In Progress)
  const task21 = await prisma.task.create({
    data: {
      projectId: tradingBotProject.id,
      milestoneId: m2.id,
      title: 'Build exchange connector',
      description: 'Implement Binance API client with rate limiting, authentication, and error handling',
      type: TaskType.INFRASTRUCTURE,
      priority: TaskPriority.HIGH,
      status: TaskStatus.RUNNING,
      statusHistory: [
        { status: 'QUEUED', timestamp: new Date('2026-03-20'), actor: '@claw-captain' },
        { status: 'READY', timestamp: new Date('2026-03-20'), actor: '@claw-captain' },
        { status: 'ASSIGNED', timestamp: new Date('2026-03-21'), actor: '@claw-captain' },
        { status: 'RUNNING', timestamp: new Date('2026-03-21'), actor: '@claw-builder' }
      ],
      requiredRole: 'FULLSTACK_DEV',
      assigneeId: builder.id,
      requiredTools: ['github', 'node', 'binance_api'],
      estimatedEffort: 6,
      startedAt: new Date('2026-03-21'),
      dueDate: new Date('2026-03-24'),
      validationCriteria: {
        criteria: [
          'All endpoints implemented',
          'Rate limiting respected',
          'Error handling tested',
          'Unit tests > 80% coverage'
        ]
      },
      retryRules: {
        max_retries: 3,
        backoff_strategy: 'exponential'
      },
      escalationPolicy: {
        on_failure: 'ESCALATE_TO_OPS',
        timeout_hours: 12
      }
    }
  })
  
  const task22 = await prisma.task.create({
    data: {
      projectId: tradingBotProject.id,
      milestoneId: m2.id,
      title: 'Implement strategy engine',
      description: 'Build the core mean reversion logic with signal generation and order execution',
      type: TaskType.TRADING_STRATEGY,
      priority: TaskPriority.HIGH,
      status: TaskStatus.AWAITING_DEPENDENCY,
      statusHistory: [
        { status: 'QUEUED', timestamp: new Date('2026-03-20'), actor: '@claw-captain' },
        { status: 'READY', timestamp: new Date('2026-03-20'), actor: '@claw-captain' }
      ],
      requiredRole: 'TRADING_LEAD',
      assigneeId: trader.id,
      dependencies: [task21.id],
      requiredTools: ['github', 'python', 'pandas'],
      estimatedEffort: 10,
      dueDate: new Date('2026-03-28'),
      blockerType: 'DEPENDENCY_UNMET',
      blockerReason: 'Waiting for exchange connector (Task 2.1) to be completed',
      validationCriteria: {
        criteria: [
          'Signals generated correctly',
          'Paper trading tested',
          'Risk checks integrated'
        ]
      }
    }
  })
  
  await prisma.task.create({
    data: {
      projectId: tradingBotProject.id,
      milestoneId: m2.id,
      title: 'Build monitoring dashboard',
      description: 'Create real-time dashboard for positions, P&L, and system health',
      type: TaskType.FEATURE,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.AWAITING_DEPENDENCY,
      statusHistory: [
        { status: 'QUEUED', timestamp: new Date('2026-03-22'), actor: '@claw-captain' }
      ],
      requiredRole: 'FULLSTACK_DEV',
      assigneeId: builder.id,
      dependencies: [task21.id],
      requiredTools: ['react', 'vercel', 'supabase'],
      estimatedEffort: 8,
      blockerType: 'DEPENDENCY_UNMET',
      blockerReason: 'Waiting for exchange connector API specification'
    }
  })
  
  // M3: Security & QA (Planned)
  await prisma.task.create({
    data: {
      projectId: tradingBotProject.id,
      milestoneId: m3.id,
      title: 'Security audit',
      description: 'Comprehensive security review of trading code, API key handling, and deployment process',
      type: TaskType.SECURITY,
      priority: TaskPriority.CRITICAL,
      status: TaskStatus.QUEUED,
      requiredRole: 'SECURITY_QA',
      assigneeId: guard.id,
      requiredTools: ['security_scanner', 'github'],
      estimatedEffort: 6,
      validationCriteria: {
        criteria: [
          'No critical vulnerabilities',
          'API keys properly secured',
          'Audit log complete'
        ]
      },
      escalationPolicy: {
        on_vulnerability_found: 'BLOCK_DEPLOYMENT'
      }
    }
  })
  
  // M4: Deployment (Planned)
  const task35 = await prisma.task.create({
    data: {
      projectId: tradingBotProject.id,
      milestoneId: m4.id,
      title: 'Deploy to production',
      description: 'Production deployment with monitoring, alerting, and kill switches active',
      type: TaskType.DEPLOYMENT,
      priority: TaskPriority.CRITICAL,
      status: TaskStatus.QUEUED,
      requiredRole: 'INFRASTRUCTURE',
      assigneeId: ops.id,
      requiredTools: ['aws', 'terraform', 'docker'],
      estimatedEffort: 4,
      validationCriteria: {
        criteria: [
          'Health checks passing',
          'Monitoring active',
          'Kill switches tested',
          'Human approval obtained'
        ]
      },
      escalationPolicy: {
        requires_approval: true,
        approvers: ['human_operator']
      }
    }
  })
  
  console.log('✅ Created tasks for Trading Bot project')
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE DECISIONS
  // ─────────────────────────────────────────────────────────────────────────────
  
  await prisma.decision.create({
    data: {
      projectId: tradingBotProject.id,
      title: 'Use Binance as primary exchange',
      description: 'Select Binance as the primary trading venue for the v1 bot',
      rationale: 'Binance offers lower trading fees (0.1% vs 0.5% on Coinbase), better API documentation, and higher liquidity for crypto pairs. The testnet is robust for paper trading.',
      authorType: 'AGENT',
      authorId: captain.id,
      authorName: '@claw-captain',
      state: DecisionState.APPROVED,
      requiredApprovals: 1,
      currentApprovals: 1,
      approvals: [
        { approver: '@gertron', timestamp: new Date('2026-03-10'), comment: 'Approved' }
      ],
      resolvedAt: new Date('2026-03-10')
    }
  })
  
  await prisma.decision.create({
    data: {
      projectId: tradingBotProject.id,
      title: 'Mean reversion strategy selection',
      description: 'Select mean reversion as the primary trading strategy',
      rationale: 'Backtests on 2024-2025 data show mean reversion performs well in ranging markets (which we expect in Q2). Strategy shows Sharpe ratio of 1.8 with max drawdown of 8%.',
      authorType: 'AGENT',
      authorId: trader.id,
      authorName: '@claw-trader',
      state: DecisionState.APPROVED,
      requiredApprovals: 1,
      currentApprovals: 1,
      approvals: [
        { approver: '@gertron', timestamp: new Date('2026-03-15'), comment: 'Approved with 10% max drawdown limit' }
      ],
      resolvedAt: new Date('2026-03-15')
    }
  })
  
  console.log('✅ Created decisions')
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE RISKS
  // ─────────────────────────────────────────────────────────────────────────────
  
  await prisma.risk.create({
    data: {
      projectId: tradingBotProject.id,
      title: 'Exchange API rate limiting',
      description: 'Binance API has strict rate limits that could interrupt trading during high volatility',
      likelihood: RiskLevel.MEDIUM,
      impact: RiskLevel.HIGH,
      score: 6, // 3 * 2
      mitigation: 'Implement request queuing with exponential backoff. Monitor rate limit headers. Have fallback to reduce polling frequency.',
      owner: '@claw-builder',
      status: RiskStatus.MITIGATING
    }
  })
  
  await prisma.risk.create({
    data: {
      projectId: tradingBotProject.id,
      title: 'Backtest overfitting',
      description: 'Strategy may be overfitted to historical data and fail in live markets',
      likelihood: RiskLevel.MEDIUM,
      impact: RiskLevel.HIGH,
      score: 6,
      mitigation: 'Use walk-forward analysis. Require out-of-sample testing. Start with small position sizes in paper trading.',
      owner: '@claw-trader',
      status: RiskStatus.MITIGATING
    }
  })
  
  await prisma.risk.create({
    data: {
      projectId: tradingBotProject.id,
      title: 'Deployment window conflict',
      description: 'Planned deployment may conflict with major market event or maintenance',
      likelihood: RiskLevel.LOW,
      impact: RiskLevel.MEDIUM,
      score: 2,
      mitigation: 'Monitor economic calendar. Have rollback procedure ready. Deploy during low-volatility periods.',
      owner: '@claw-ops',
      status: RiskStatus.IDENTIFIED
    }
  })
  
  console.log('✅ Created risks')
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE ARTIFACTS
  // ─────────────────────────────────────────────────────────────────────────────
  
  await prisma.artifact.create({
    data: {
      projectId: tradingBotProject.id,
      type: ArtifactType.SPECIFICATION,
      name: 'Trading Strategy Specification v1',
      description: 'Detailed specification of the mean reversion strategy including entry/exit logic',
      url: 'https://github.com/gertron88/trading-bot/docs/strategy_spec_v1.md',
      githubRepo: 'gertron88/trading-bot',
      validated: true,
      validatedAt: new Date('2026-03-16'),
      validatedBy: '@claw-guard'
    }
  })
  
  await prisma.artifact.create({
    data: {
      projectId: tradingBotProject.id,
      taskId: task21.id,
      type: ArtifactType.CODE,
      name: 'Exchange Connector Module',
      description: 'Binance API client implementation',
      url: 'https://github.com/gertron88/trading-bot/pull/12',
      githubRepo: 'gertron88/trading-bot',
      githubPr: '12',
      validated: false
    }
  })
  
  console.log('✅ Created artifacts')
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE SYSTEM CONFIG
  // ─────────────────────────────────────────────────────────────────────────────
  
  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'trading_enabled',
        value: true,
        description: 'Global trading enable/disable'
      },
      {
        key: 'default_risk_limits',
        value: {
          maxPositionSize: 5000,
          maxDailyLoss: 500,
          maxOrdersPerMinute: 10
        },
        description: 'Default risk limits for new trading agents'
      },
      {
        key: 'discord_notifications',
        value: {
          task_created: true,
          task_completed: true,
          task_blocked: true,
          trade_executed: true,
          kill_switch: true,
          deployment: true,
          risk_alert: true
        },
        description: 'Discord notification settings'
      },
      {
        key: 'dispatch_scoring_weights',
        value: {
          priority: 0.3,
          urgency: 0.2,
          unlock_value: 0.2,
          strategic_value: 0.15,
          execution_risk: -0.1,
          cost: -0.05
        },
        description: 'Weights for task dispatch scoring algorithm'
      }
    ]
  })
  
  console.log('✅ Created system config')
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE SECOND PROJECT: Analytics Portal
  // ─────────────────────────────────────────────────────────────────────────────
  
  const analyticsProject = await prisma.project.create({
    data: {
      portfolioId: portfolio.id,
      name: 'Analytics Portal',
      charter: 'Build a web-based analytics dashboard for monitoring trading performance and system health',
      state: ProjectState.PLANNING,
      objectives: [
        { objective: 'Real-time P&L visualization', target: '<5s delay', metric: 'data_freshness' },
        { objective: 'Trade history export', target: 'CSV, JSON formats', metric: 'export_formats' },
        { objective: 'Agent performance metrics', target: 'All agents tracked', metric: 'coverage' }
      ],
      budgetAllocated: 8000.00,
      plannedStart: new Date('2026-04-01'),
      plannedEnd: new Date('2026-05-15')
    }
  })
  
  console.log(`✅ Created second project: ${analyticsProject.name}`)
  
  console.log('')
  console.log('🎉 Seed complete!')
  console.log('')
  console.log('Portfolio:', portfolio.name)
  console.log('Projects: 2')
  console.log('Agents: 5')
  console.log('Tasks: Created for Trading Bot project')
  console.log('')
  console.log('Next steps:')
  console.log('1. Run npm run dev to start the development server')
  console.log('2. Visit http://localhost:3000 to see the dashboard')
  console.log('3. Configure Discord webhook in environment variables')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
