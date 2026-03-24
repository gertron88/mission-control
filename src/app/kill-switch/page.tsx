'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAgents } from '@/hooks/useAgents'
import { AlertTriangle, Shield, Power, Activity } from 'lucide-react'

export default function KillSwitchPage() {
  const { data: agents = [], isLoading: loading } = useAgents()
  const [activating, setActivating] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ type: string; target?: string } | null>(null)

  const handleKillSwitch = async (scope: string, targetId?: string) => {
    setActivating(scope)
    try {
      const response = await fetch('/api/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          targetId,
          reason: 'Emergency stop triggered from Mission Control',
          actorId: 'human_operator',
          actorName: 'Human Operator'
        })
      })
      
      if (!response.ok) throw new Error('Kill switch failed')
      
      alert(`${scope === 'ALL' ? 'Global' : 'Agent'} kill switch activated!`)
    } catch (error) {
      alert('Failed to activate kill switch')
    } finally {
      setActivating(null)
      setConfirmDialog(null)
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-slate-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-red-900">Emergency Controls</h1>
                <p className="text-red-700">Use these controls to immediately halt all or specific agent operations</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Global Kill Switch</h2>
            <p className="text-slate-500 mb-6">
              This will immediately halt ALL trading operations across all agents. 
              All open positions will be preserved but no new orders will be placed.
            </p>

            <button
              onClick={() => setConfirmDialog({ type: 'ALL' })}
              disabled={activating === 'ALL'}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-semibold"
            >
              <Power className="w-5 h-5" />
              {activating === 'ALL' ? 'Activating...' : 'ACTIVATE GLOBAL KILL SWITCH'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Per-Agent Kill Switches</h2>
            
            <div className="space-y-4">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded"></div>
                  ))}
                </div>
              ) : (
                agents.map((agent) => (
                  <div 
                    key={agent.id} 
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                        <Activity className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{agent.handle}</div>
                        <div className="text-sm text-slate-500">{agent.role.replace('_', ' ')}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setConfirmDialog({ type: 'AGENT', target: agent.id })}
                      disabled={activating === agent.id}
                      className="px-4 py-2 bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      {activating === agent.id ? 'Stopping...' : 'Stop Agent'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important Notes:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>All kill switch activations are logged and require justification</li>
                  <li>Open trading positions are NOT automatically closed</li>
                  <li>Restarting operations requires manual approval</li>
                  <li>Discord notifications will be sent to the team</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {confirmDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <h3 className="text-xl font-bold text-slate-900">Confirm Kill Switch</h3>
              </div>

              <p className="text-slate-600 mb-6">
                {confirmDialog.type === 'ALL' 
                  ? 'Are you sure you want to activate the GLOBAL kill switch? This will halt ALL trading operations immediately.'
                  : 'Are you sure you want to stop this agent? It will halt all their trading operations.'
                }
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleKillSwitch(confirmDialog.type, confirmDialog.target)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium"
                >
                  Confirm Stop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
