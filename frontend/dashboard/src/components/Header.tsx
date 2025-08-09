import React from 'react'

export function Header({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  return (
    <header className="border-b border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">NeuroZK Trader Dashboard</h1>
        <div className="flex items-center gap-3">
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
