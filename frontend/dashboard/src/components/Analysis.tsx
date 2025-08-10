import React, { useEffect, useState } from 'react'
import { createWS, WSMessage } from '../lib/ws'

export function Analysis() {
  const [lines, setLines] = useState<Array<{ ts: number; source: string; line: string }>>([])

  const renderLine = (text: string) => {
    // lightweight highlighting for nicer look
    const parts: Array<{ t: string; cls?: string }> = []
    const push = (t: string, cls?: string) => parts.push({ t, cls })
    const tokens = text.split(/(SUCCESS|PASS|PASSED|VERIFIED|✓|ERROR|FAIL|FAILED|REVERT|REJECTED|PENDING)/i)
    for (const tk of tokens) {
      const key = tk.toLowerCase()
      if (!tk) continue
      if (['success', 'pass', 'passed', 'verified', '✓'].includes(key)) push(tk, 'text-emerald-400')
      else if (['error', 'fail', 'failed', 'revert', 'rejected'].includes(key)) push(tk, 'text-rose-400')
      else if (['pending'].includes(key)) push(tk, 'text-amber-400')
      else push(tk)
    }
    return (
      <span className="text-sm leading-6">
        {parts.map((p, i) => (
          <span key={i} className={p.cls}>{p.t}</span>
        ))}
      </span>
    )
  }

  useEffect(() => {
    const url = (import.meta as any).env.VITE_WS_URL as string | undefined
    if (!url) return
    const ws = createWS(url, (msg: WSMessage) => {
      if (msg.type === 'analysis') {
        const p = msg.payload || {}
        setLines((cur) => [{ ts: p.ts || Date.now(), source: p.source || 'cli', line: String(p.line || '') }, ...cur].slice(0, 200))
      }
    })
    return () => ws.close()
  }, [])

  return (
    <div className="glass-card neon-border glass-hover shimmer p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Terminal Analysis</h2>
        <span className="text-xs opacity-70">live</span>
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="text-left opacity-70">
            <tr>
              <th className="py-2 pr-4">Line</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td className="py-3" colSpan={1}>No analysis yet. Run ws feeder and pipe CLI (see README Live Demo).</td>
              </tr>
            )}
            {lines.map((it, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="py-2 pr-4 align-top text-white/90">
                  <div className="whitespace-normal break-words">
                    {renderLine(it.line)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
