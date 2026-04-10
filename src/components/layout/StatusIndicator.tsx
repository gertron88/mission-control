'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

/**
 * Connection status indicator with tooltip
 * Polls /api/health/services for connection status
 * 
 * States:
 * - Connected: Green pulse animation
 * - Disconnected: Red static
 * - Reconnecting: Amber spinner
 */
export function StatusIndicator() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health/services')
        if (!res.ok) {
          console.error('[StatusIndicator] Health check failed:', res.status, res.statusText)
          setStatus('error')
          return
        }
        
        let services
        try {
          services = await res.json()
        } catch (parseErr) {
          console.error('[StatusIndicator] Failed to parse response:', parseErr)
          setStatus('error')
          return
        }
        
        // Validate response is an array
        if (!Array.isArray(services)) {
          console.error('[StatusIndicator] Invalid response format (expected array):', services)
          setStatus('error')
          return
        }
        
        // Handle empty array - still connected if API responds
        if (services.length === 0) {
          setStatus('connected')
          return
        }
        
        const allHealthy = services.every((s: {status: string}) => s.status === 'healthy')
        setStatus(allHealthy ? 'connected' : 'error')
      } catch (err) {
        console.error('[StatusIndicator] Health check error:', err)
        setStatus('disconnected')
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])
  const [showTooltip, setShowTooltip] = useState(false)

  const config = {
    connected: {
      icon: Wifi,
      label: 'Connected',
      dotClass: 'bg-emerald-500 animate-pulse',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    disconnected: {
      icon: WifiOff,
      label: 'Disconnected',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-700 dark:text-rose-400',
      bgClass: 'bg-rose-50 dark:bg-rose-900/20',
    },
    error: {
      icon: WifiOff,
      label: 'Connection Error',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-700 dark:text-rose-400',
      bgClass: 'bg-rose-50 dark:bg-rose-900/20',
    },
    connecting: {
      icon: Loader2,
      label: 'Reconnecting...',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-700 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    },
  }

  const current = config[status]
  const Icon = current.icon

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-default transition-colors ${current.bgClass} ${current.textClass}`}
      >
        {status === 'connecting' ? (
          <Icon className="w-4 h-4 animate-spin" />
        ) : (
          <span className={`w-2 h-2 rounded-full ${current.dotClass}`} />
        )}
        <span className="hidden sm:inline">{current.label}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            {current.label}
            <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45" />
          </div>
        </div>
      )}
    </div>
  )
}
