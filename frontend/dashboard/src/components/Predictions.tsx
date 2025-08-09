import React, { useEffect, useMemo, useState } from 'react'
import { createWS, WSMessage } from '../lib/ws'

export function Predictions() {
  const [items, setItems] = useState<Array<{ ts: number; inst: string; horizon: number; probUp: number }>>([])

  useEffect(() => {
    const url = import.meta.env.VITE_WS_URL as string | undefined
    if (!url) return
    const ws = createWS(url, (msg: WSMessage) => {
      if (msg.type === 'prediction') {
        const p = msg.payload || {}
        setItems((cur) => [{ ts: Date.now(), inst: p.inst, horizon: p.horizon, probUp: p.probUp }, ...cur].slice(0, 50))
      }
    })
    return () => ws.close()
  }, [])

  return (
    <div className="rounded-xl border border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Predictions</h2> {/* JSX element implicitly has type 'any' because no interface 'JSX.IntrinsicElements' exists. */}
        <span className="text-xs opacity-70">live</span>
      </div>
      <div className="mt-3 overflow-x-auto">
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
