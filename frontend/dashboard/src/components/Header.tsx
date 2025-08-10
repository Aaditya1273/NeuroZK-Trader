import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useBalance } from '../hooks/useBalance'

export function Header({ dark, setDark, onOpenWallet }: { dark: boolean; setDark: (v: boolean) => void; onOpenWallet: () => void }) {
  const { isAuthenticated, address, wallet, switchWallet } = useAuth()
  const balance = useBalance((wallet as any)?.provider, address)
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''

  return (
    <header className="border-b border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="inline-block group">
          <h1 className="text-xl font-semibold">NeuroZK Trader Dashboard</h1>
          <span className="block h-0.5 mt-0.5 bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full transition-transform duration-300 origin-left scale-x-0 group-hover:scale-x-100" />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenWallet}
            title="Open Wallet"
            className="hidden sm:inline-flex h-16 w-16 items-center justify-center rounded-lg text-white transition-transform duration-200 hover:scale-120 hover:-translate-y-0.5 hover:rotate-3 active:scale-110"
            aria-label="Open Wallet"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="walletGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#e9d5ff" stopOpacity="0.95" />
                  <stop offset="1" stopColor="#c084fc" stopOpacity="0.95" />
                </linearGradient>
              </defs>
              <path d="M3 7.5C3 6.119 4.119 5 5.5 5H16a2.5 2.5 0 0 1 0 5H5.5C4.119 10 3 8.881 3 7.5Z" fill="url(#walletGrad)" opacity="0.95"/>
              <rect x="3" y="7" width="18" height="12" rx="3" fill="url(#walletGrad)" opacity="0.7"/>
              <rect x="14" y="10" width="7" height="6" rx="2" fill="#7c3aed" opacity="0.85"/>
              <circle cx="18" cy="13" r="1" fill="#fff"/>
              <path d="M5 9.5h8" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-md border border-white/10 bg-white/40 dark:bg-white/10">
              <span className="text-sm font-mono">{short}</span>
              <span className="text-sm opacity-75">{balance} ETH</span>
              <button onClick={switchWallet} className="px-2 py-1 text-sm rounded-md border border-white/10 hover:border-white/30">
                Switch Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
