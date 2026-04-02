const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function seed() {
  console.log('Seeding...')

  try {
    // Test connection first
    console.log('Testing connection...')
    await prisma.$connect()
    console.log('Connected!')

    // Create agent
    console.log('Creating agent...')
    await prisma.agent.upsert({
      where: { id: 'agent-001' },
      update: {},
      create: {
        id: 'agent-001',
        handle: '@hudson',
        name: 'Hudson',
        role: 'COORDINATOR',
        model: 'kimi-coding/k2p5',
        status: 'ONLINE',
        apiKeyRef: 'key-hudson',
        capabilities: ['Planning', 'Coding', 'Review'],
      },
    })
    console.log('Created agent')

    // Create portfolio
    console.log('Creating portfolio...')
    await prisma.portfolio.upsert({
      where: { id: 'portfolio-001' },
      update: {},
      create: {
        id: 'portfolio-001',
        name: 'Main Portfolio',
        slug: 'main',
      },
    })
    console.log('Created portfolio')

    // Create project
    console.log('Creating project...')
    await prisma.project.upsert({
      where: { id: 'project-001' },
      update: {},
      create: {
        id: 'project-001',
        portfolioId: 'portfolio-001',
        name: 'Mission Control UI',
        slug: 'mission-control-ui',
        description: 'Dashboard and agent orchestration platform',
        state: 'EXECUTING',
        progress: 75,
        budgetAllocated: 50000,
        budgetSpent: 21480,
      },
    })
    console.log('Created project')

    // Create task
    console.log('Creating task...')
    await prisma.task.upsert({
      where: { id: 'task-001' },
      update: {},
      create: {
        id: 'task-001',
        projectId: 'project-001',
        number: 1,
        title: 'Connect real data',
        description: 'Wire dashboard to API endpoints',
        type: 'FEATURE',
        status: 'RUNNING',
        priority: 'HIGH',
        assigneeId: 'agent-001',
      },
    })
    console.log('Created task')

    console.log('Seed complete!')
  } catch (error) {
    console.error('Seed error:', error)
    console.error('Error details:', error.message)
    if (error.meta) console.error('Error meta:', error.meta)
    throw error
  }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
