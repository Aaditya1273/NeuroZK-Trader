import React, { useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { Predictions } from './components/Predictions'
import { TradeHistory } from './components/TradeHistory'
import { AccountHealth } from './components/AccountHealth'

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
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <Predictions />
          <div className="mt-6">
            <TradeHistory />
          </div>
        </section>
        <aside className="lg:col-span-1">
          <AccountHealth />
        </aside>
      </main>
    </div>
  )
}
