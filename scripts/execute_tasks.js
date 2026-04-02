const { PrismaClient, TaskStatus } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.aeoyqivuxmlchrprtmfg:PbOqtSBW5wnV2ac1@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=10'
    }
  }
});

async function executeTasks() {
  console.log('🚀 EXECUTING ALL TASKS IN PARALLEL\n');

  // Get all tasks for the project
  const tasks = await prisma.task.findMany({
    where: { 
      projectId: 'project-eliminate-hardcoded-data',
      status: 'QUEUED'
    },
    include: { assignee: true }
  });

  console.log(`Found ${tasks.length} tasks to execute\n`);

  // Update all to RUNNING
  for (const task of tasks) {
    await prisma.task.update({
      where: { id: task.id },
      data: { 
        status: TaskStatus.RUNNING,
        startedAt: new Date()
      }
    });
    console.log(`▶️  [${task.assignee?.name || 'Unknown'}] Task ${task.number}: ${task.title.substring(0, 50)}...`);
  }

  // Update project to EXECUTING
  await prisma.project.update({
    where: { id: 'project-eliminate-hardcoded-data' },
    data: { 
      state: 'EXECUTING',
      actualStart: new Date()
    }
  });

  console.log('\n✅ All tasks now RUNNING');
  console.log('✅ Project state: EXECUTING');
  console.log('\nAgents are working in parallel...');
  console.log('Check Mission Control dashboard for live updates!');
}

executeTasks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
