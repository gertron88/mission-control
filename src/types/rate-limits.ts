/**
 * Rate Limit and Usage Tracking Types
 * 
 * These types define the structure for tracking agent rate limits,
 * usage quotas, and cooldown periods across various external services.
 */

/**
 * Rate limit status from an external API (e.g., OpenAI, Anthropic)
 */
export interface ApiRateLimit {
  /** Remaining requests in current window */
  requestsRemaining: number;
  /** Total requests allowed in window */
  requestsLimit: number;
  /** When the rate limit resets */
  resetAt: Date;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Whether the limit has been hit */
  hitLimit: boolean;
}

/**
 * Token bucket rate limit (for token-based APIs)
 */
export interface TokenRateLimit {
  /** Remaining tokens in current window */
  tokensRemaining: number;
  /** Total tokens allowed in window */
  tokensLimit: number;
  /** When the token limit resets */
  resetAt: Date;
}

/**
 * Agent usage tracking for the current period
 */
export interface AgentUsage {
  /** Unique agent identifier */
  agentId: string;
  
  /** Daily task completion tracking */
  daily: {
    /** Tasks completed today */
    tasksCompleted: number;
    /** Task limit per day */
    taskLimit: number;
    /** Date of last reset (YYYY-MM-DD) */
    lastResetDate: string;
    /** Whether daily limit is exceeded */
    limitExceeded: boolean;
  };
  
  /** API usage tracking */
  apiUsage: {
    /** Total API calls made today */
    totalCalls: number;
    /** API call limit per day */
    callLimit: number;
    /** Total tokens consumed today */
    tokensConsumed: number;
    /** Token limit per day */
    tokenLimit: number;
    /** Costs incurred today (in USD) */
    estimatedCost: number;
    /** Cost limit per day (in USD) */
    costLimit: number;
  };
  
  /** Current rate limit status from primary API */
  currentRateLimit?: ApiRateLimit;
  
  /** When the agent was last rate limited */
  lastRateLimitedAt?: Date;
  
  /** Reason for rate limit (if currently limited) */
  rateLimitReason?: string;
}

/**
 * Trading-specific usage limits
 */
export interface TradingUsage {
  /** Daily loss tracking */
  dailyLoss: {
    /** Current daily loss amount */
    current: number;
    /** Daily loss limit */
    limit: number;
    /** Percentage of limit used */
    percentageUsed: number;
  };
  
  /** Position limits */
  positions: {
    /** Current open positions */
    open: number;
    /** Maximum allowed positions */
    maxOpen: number;
  };
  
  /** Order rate limiting */
  orders: {
    /** Orders placed in current minute */
    thisMinute: number;
    /** Max orders per minute */
    perMinuteLimit: number;
    /** Orders placed today */
    today: number;
    /** Daily order limit */
    dailyLimit: number;
  };
  
  /** Kill switch status */
  killSwitch: {
    /** Whether kill switch is active */
    active: boolean;
    /** When kill switch was triggered */
    triggeredAt?: Date;
    /** Reason for kill switch */
    reason?: string;
  };
}

/**
 * Cooldown period configuration
 */
export interface CooldownConfig {
  /** Cooldown type identifier */
  type: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** When cooldown started */
  startedAt: Date;
  /** When cooldown ends */
  endsAt: Date;
  /** Reason for cooldown */
  reason: string;
  /** Whether cooldown is currently active */
  isActive: boolean;
}

/**
 * Rate limit check result
 */
export interface RateLimitCheck {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** When the rate limit will reset (if applicable) */
  retryAfter?: Date;
  /** Current usage percentage */
  usagePercentage?: number;
  /** Which limit was hit */
  limitType?: 'DAILY_TASKS' | 'DAILY_API_CALLS' | 'DAILY_TOKENS' | 'DAILY_COST' | 'DAILY_LOSS' | 'RATE_LIMIT_RESET';
}

/**
 * Rate limit reset schedule
 */
export interface RateLimitReset {
  /** Type of limit */
  limitType: string;
  /** When the limit resets */
  resetAt: Date;
  /** Time until reset in milliseconds */
  timeUntilResetMs: number;
  /** Whether agent will be auto-reactivated */
  willReactivate: boolean;
}

/**
 * Agent capability with rate limit info
 */
export interface RateLimitedCapability {
  /** Capability name */
  capability: string;
  /** Whether capability is currently available */
  available: boolean;
  /** Reason if unavailable */
  unavailableReason?: string;
  /** When capability will be available again */
  availableAfter?: Date;
}

/**
 * Health check result including rate limit status
 */
export interface AgentHealthStatus {
  /** Overall health status */
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'RATE_LIMITED';
  
  /** Last successful heartbeat timestamp */
  lastHeartbeatAt: Date;
  
  /** Time since last heartbeat in ms */
  timeSinceLastHeartbeatMs: number;
  
  /** Whether agent is stale (no heartbeat recently) */
  isStale: boolean;
  
  /** Rate limit status */
  rateLimits: {
    /** Currently active rate limits */
    active: string[];
    /** Upcoming resets */
    upcomingResets: RateLimitReset[];
    /** Overall rate limit health */
    healthy: boolean;
  };
  
  /** Resource usage */
  resources: {
    /** CPU usage percentage */
    cpuPercent?: number;
    /** Memory usage percentage */
    memoryPercent?: number;
    /** Active task count */
    activeTasks: number;
    /** Whether at capacity */
    atCapacity: boolean;
  };
  
  /** Active warnings */
  warnings: string[];
}

/**
 * Event payload for rate limit events
 */
export interface RateLimitEvent {
  /** Agent ID */
  agentId: string;
  /** Type of event */
  eventType: 'RATE_LIMIT_HIT' | 'RATE_LIMIT_RESET' | 'RATE_LIMIT_WARNING';
  /** Limit that was hit or reset */
  limitType: string;
  /** When the event occurred */
  timestamp: Date;
  /** Additional context */
  details?: {
    /** Usage at time of event */
    usage?: number;
    /** Limit that was hit */
    limit?: number;
    /** When limit will reset */
    resetAt?: Date;
  };
}

/**
 * Configuration for automatic rate limit handling
 */
export interface RateLimitConfig {
  /** Daily task limit per agent */
  dailyTaskLimit: number;
  /** Daily API call limit */
  dailyApiCallLimit: number;
  /** Daily token limit */
  dailyTokenLimit: number;
  /** Daily cost limit in USD */
  dailyCostLimit: number;
  /** Cooldown duration after hitting rate limit (ms) */
  cooldownDurationMs: number;
  /** Whether to auto-retry rate-limited operations */
  autoRetry: boolean;
  /** Max retry attempts */
  maxRetries: number;
  /** Base delay between retries (ms) */
  retryBaseDelayMs: number;
  /** Whether to disable agent when rate limited */
  disableOnRateLimit: boolean;
  /** Whether to auto-re-enable after reset */
  autoReEnable: boolean;
}
