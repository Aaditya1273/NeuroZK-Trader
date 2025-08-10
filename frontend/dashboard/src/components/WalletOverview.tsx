import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useBalance } from '../hooks/useBalance'

export function WalletOverview() {
  const { address, wallet } = useAuth()
  const balance = useBalance((wallet as any)?.provider, address)
  const short = address ? `${address.slice(0, 10)}…${address.slice(-8)}` : ''

  return (
    <div className="bg-white/70 dark:bg-black/40 backdrop-blur rounded-lg border border-white/10 p-5">
      <h2 className="text-lg font-semibold mb-3">Wallet Overview</h2>
      <div className="space-y-2 text-sm">
        <div className="opacity-75">Connected Address</div>
        <div className="font-mono break-all">{address || '—'}</div>
        <div className="opacity-75 mt-3">Native Balance</div>
        <div className="font-medium">{balance} ETH</div>
      </div>
    </div>
  )
}
