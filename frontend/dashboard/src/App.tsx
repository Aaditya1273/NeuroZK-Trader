import React, { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { AccountHealth } from './components/AccountHealth'
import { WalletOverview } from './components/WalletOverview'
import { Analysis } from './components/Analysis'
import { WalletModal } from './components/WalletModal'

export default function App() {
  const [dark, setDark] = useState(true)
  const [walletOpen, setWalletOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [dark])

  return (
    <div className="min-h-screen">
      <Header dark={dark} setDark={setDark} onOpenWallet={() => setWalletOpen(true)} />
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 gap-6">
        <section className="space-y-6">
          <div className="glass-card neon-border glass-hover shimmer anim-slide-in anim-delay-1 p-4">
            <Analysis />
          </div>
        </section>
      </main>
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </div>
  )
}
