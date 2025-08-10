import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useBalance } from '../hooks/useBalance'

export function Header({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const { isAuthenticated, address, wallet, switchWallet } = useAuth()
  const balance = useBalance((wallet as any)?.provider, address)
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''

  return (
    <header className="border-b border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">NeuroZK Trader Dashboard</h1>
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-md border border-white/10 bg-white/40 dark:bg-white/10">
              <span className="text-sm font-mono">{short}</span>
              <span className="text-sm opacity-75">{balance} ETH</span>
              <button onClick={switchWallet} className="px-2 py-1 text-sm rounded-md border border-white/10 hover:border-white/30">
                Switch Wallet
              </button>
            </div>
          )}
          <span className="text-sm opacity-75">{dark ? 'Dark' : 'Light'} mode</span>
          <button
            onClick={() => setDark(!dark)}
            className="px-3 py-1 rounded-md border border-white/10 hover:border-white/30 transition"
            aria-label="Toggle theme"
          >
            {dark ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  )
}
