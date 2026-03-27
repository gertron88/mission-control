import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { sendToDiscord } from '@/lib/discord'
import { broadcastEvent } from '@/lib/events'
import { ActorType, AuditSeverity } from '@prisma/client'

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic'

// POST /api/kill-switch - Emergency stop
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      scope, // 'ALL', 'AGENT', 'EXCHANGE'
      targetId, // agentId or exchange name
      reason,
      actorId,
      actorName,
    } = body
    
    const timestamp = new Date()
    
    if (scope === 'ALL') {
      // Kill all trading
      await prisma.tradingConfig.updateMany({
        data: {
          killSwitchEnabled: true,
          lastKillSwitchAt: timestamp,
        },
      })
      
      await logAction({
        actorType: ActorType.HUMAN,
        actorId,
        actorName,
        action: 'KILL_SWITCH_ALL',
        resourceType: 'System',
        severity: AuditSeverity.CRITICAL,
      })
      
      broadcastEvent({
        type: 'KILL_SWITCH_TRIGGERED',
        scope: 'ALL',
        timestamp,
      })
      
      await sendToDiscord({
        content: '🚨 **EMERGENCY KILL SWITCH ACTIVATED** 🚨\n' +
          `All trading has been halted.\n` +
          `Reason: ${reason || 'Emergency stop'}\n` +
          `Triggered by: ${actorName}`,
      })
      
    } else if (scope === 'AGENT' && targetId) {
      // Kill specific agent
      await prisma.tradingConfig.updateMany({
        where: { agentId: targetId },
        data: {
          killSwitchEnabled: true,
          lastKillSwitchAt: timestamp,
        },
      })
      
      const agent = await prisma.agent.findUnique({
        where: { id: targetId },
        select: { handle: true },
      })
      
      await logAction({
        actorType: ActorType.HUMAN,
        actorId,
        actorName,
        action: 'KILL_SWITCH_AGENT',
        resourceType: 'Agent',
        resourceId: targetId,
        severity: AuditSeverity.CRITICAL,
      })
      
      broadcastEvent({
        type: 'KILL_SWITCH_TRIGGERED',
        scope: 'AGENT',
        agentId: targetId,
        timestamp,
      })
      
      await sendToDiscord({
        content: `🛑 **Agent Kill Switch**: ${agent?.handle || targetId}\n` +
          `Trading halted for this agent.\n` +
          `Reason: ${reason || 'Manual trigger'}`,
      })
    }
    
    return NextResponse.json({ success: true, timestamp })
  } catch (error) {
    console.error('Kill switch failed:', error)
    return NextResponse.json({ error: 'Kill switch failed' }, { status: 500 })
  }
}

// DELETE /api/kill-switch - Reset kill switch
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { scope, targetId, actorId, actorName } = body
    
    if (scope === 'ALL') {
      await prisma.tradingConfig.updateMany({
        data: { killSwitchEnabled: false },
      })
      
      await logAction({
        actorType: ActorType.HUMAN,
        actorId,
        actorName,
        action: 'KILL_SWITCH_RESET_ALL',
        resourceType: 'System',
        severity: AuditSeverity.WARNING,
      })
      
      broadcastEvent({
        type: 'KILL_SWITCH_RESET',
        scope: 'ALL',
      })
      
      await sendToDiscord({
        content: '✅ **Kill switch reset** — Trading resumed for all agents',
      })
      
    } else if (scope === 'AGENT' && targetId) {
      await prisma.tradingConfig.updateMany({
        where: { agentId: targetId },
        data: { killSwitchEnabled: false },
      })
      
      await logAction({
        actorType: ActorType.HUMAN,
        actorId,
        actorName,
        action: 'KILL_SWITCH_RESET_AGENT',
        resourceType: 'Agent',
        resourceId: targetId,
      })
      
      broadcastEvent({
        type: 'KILL_SWITCH_RESET',
        scope: 'AGENT',
        agentId: targetId,
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reset kill switch:', error)
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 })
  }
}
