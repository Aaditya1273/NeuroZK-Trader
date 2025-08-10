import React, { useState } from 'react'
import { WalletOverview } from './WalletOverview'
import { AccountHealth } from './AccountHealth'

export function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'health'>('overview')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-white/60 dark:bg-black/30 backdrop-blur-xl shadow-2xl neon-border glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/70 to-fuchsia-500/70 text-white">💼</span>
              <h3 className="text-lg font-semibold">Wallet</h3>
            </div>
            <button onClick={onClose} className="px-2 py-1 text-sm rounded bg-white/30 dark:bg-white/10 hover:bg-white/40">Close</button>
          </div>
          <div className="px-5 pt-3">
            <div className="inline-flex rounded-lg border border-white/10 bg-white/20 dark:bg-white/10 overflow-hidden">
              <button onClick={() => setTab('overview')} className={`px-4 py-2 text-sm ${tab==='overview' ? 'bg-violet-500/40 text-white' : 'hover:bg-white/20'}`}>Overview</button>
              <button onClick={() => setTab('health')} className={`px-4 py-2 text-sm ${tab==='health' ? 'bg-violet-500/40 text-white' : 'hover:bg-white/20'}`}>Account Health</button>
            </div>
          </div>
          <div className="p-5">
            {tab === 'overview' ? (
              <div className="glass-card neon-border p-4"><WalletOverview /></div>
            ) : (
              <div className="glass-card neon-border p-4"><AccountHealth /></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
