import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createWS, WSMessage } from '../lib/ws'

export function Predictions() {
  const [items, setItems] = useState<Array<{ ts: number; inst: string; horizon: number; probUp: number }>>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const url = import.meta.env.VITE_WS_URL as string | undefined
    if (!url) return
    const ws = createWS(url, (msg: WSMessage) => {
      if (msg.type === 'prediction') {
        const p = msg.payload || {}
        setItems((cur) => [{ ts: Date.now(), inst: p.inst, horizon: p.horizon, probUp: p.probUp }, ...cur].slice(0, 200))
      }
    })
    return () => ws.close()
  }, [])

  return (
    <div className="rounded-xl border border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Predictions</h2> {/* JSX element implicitly has type 'any' because no interface 'JSX.IntrinsicElements' exists. */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-xs px-2 py-1 rounded bg-white/30 dark:bg-white/10 hover:bg-white/40"
            title="Scroll to top"
          >Top</button>
          <button
            onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
            className="text-xs px-2 py-1 rounded bg-white/30 dark:bg-white/10 hover:bg-white/40"
            title="Scroll to bottom"
          >Bottom</button>
          <span className="text-xs opacity-70">live</span>
        </div>
      </div>
      <div ref={scrollRef} className="mt-3 overflow-x-auto overflow-y-auto max-h-72 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="text-left opacity-70">
            <tr>
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">Instrument</th>
              <th className="py-2 pr-4">Horizon</th>
              <th className="py-2 pr-4">Prob Up</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td className="py-3" colSpan={4}>No predictions yet. Connect WS via VITE_WS_URL.</td>
              </tr>
            )}
            {items.map((it, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="py-2 pr-4">{new Date(it.ts).toLocaleTimeString()}</td>
                <td className="py-2 pr-4">{it.inst}</td>
                <td className="py-2 pr-4">{it.horizon}m</td>
                <td className="py-2 pr-4">
                  <span className={
                    it.probUp >= 0.55 ? 'text-emerald-400' : it.probUp <= 0.45 ? 'text-rose-400' : 'text-amber-400'
                  }>
                    {(it.probUp * 100).toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
