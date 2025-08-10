import React, { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { AccountHealth } from './components/AccountHealth'
import { WalletOverview } from './components/WalletOverview'
import { Analysis } from './components/Analysis'

export default function App() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [dark])

  return (
    <div className="min-h-screen">
      <Header dark={dark} setDark={setDark} />
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="glass-card neon-border glass-hover shimmer anim-slide-in anim-delay-1 p-4">
            <Analysis />
          </div>
        </section>
        <aside className="lg:col-span-1">
          <div className="space-y-6">
            <div className="glass-card neon-border glass-hover shimmer anim-slide-in anim-delay-2 p-4">
              <WalletOverview />
            </div>
            <AccountHealth />
          </div>
        </aside>
      </main>
    </div>
  )
}
