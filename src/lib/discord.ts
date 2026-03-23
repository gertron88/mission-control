import { WebhookClient, EmbedBuilder } from 'discord.js'

let webhookClient: WebhookClient | null = null

export function getDiscordClient() {
  if (!webhookClient && process.env.DISCORD_WEBHOOK_URL) {
    webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL })
  }
  return webhookClient
}

interface DiscordMessage {
  content?: string
  embeds?: EmbedBuilder[]
  username?: string
  avatarURL?: string
}

export async function sendToDiscord(message: DiscordMessage) {
  const client = getDiscordClient()
  if (!client) {
    console.warn('Discord webhook not configured')
    return
  }

  try {
    await client.send(message)
  } catch (error) {
    console.error('Failed to send Discord message:', error)
  }
}

export function createTaskEmbed(task: {
  number: number
  title: string
  status: string
  priority: string
  assignee?: { handle: string; name: string } | null
  url: string
}) {
  const statusColors: Record<string, number> = {
    BACKLOG: 0x95a5a6,
    TODO: 0x3498db,
    IN_PROGRESS: 0xf39c12,
    IN_REVIEW: 0x9b59b6,
    DONE: 0x2ecc71,
    BLOCKED: 0xe74c3c,
  }

  return new EmbedBuilder()
    .setTitle(`TASK-#${task.number}: ${task.title}`)
    .setURL(task.url)
    .setColor(statusColors[task.status] || 0x95a5a6)
    .addFields(
      { name: 'Status', value: task.status, inline: true },
      { name: 'Priority', value: task.priority, inline: true },
      { name: 'Assignee', value: task.assignee?.handle || 'Unassigned', inline: true }
    )
    .setTimestamp()
}

export function createTradingEmbed(position: {
  symbol: string
  side: string
  size: string
  entryPrice: string
  unrealizedPnl?: string | null
}) {
  const isProfit = position.unrealizedPnl && parseFloat(position.unrealizedPnl.toString()) >= 0
  
  return new EmbedBuilder()
    .setTitle(`📊 ${position.symbol} Position Update`)
    .setColor(isProfit ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: 'Side', value: position.side, inline: true },
      { name: 'Size', value: position.size, inline: true },
      { name: 'Entry', value: `$${position.entryPrice}`, inline: true },
      { name: 'P&L', value: position.unrealizedPnl ? `$${position.unrealizedPnl}` : 'N/A', inline: true }
    )
    .setTimestamp()
}
