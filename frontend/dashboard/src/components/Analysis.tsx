import React, { useEffect, useRef, useState } from 'react'
import { createWS, WSMessage } from '../lib/ws'

export function Analysis() {
  const [lines, setLines] = useState<Array<{ ts: number; source: string; line: string }>>([])
  const scrollerRef = useRef<HTMLDivElement>(null)

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
        setLines((cur) => [...cur, { ts: p.ts || Date.now(), source: p.source || 'cli', line: String(p.line || '') }].slice(-200))
      }
    })
    return () => ws.close()
  }, [])

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines])

  return (
    <div className="glass-card neon-border glass-hover shimmer p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Terminal Analysis</h2>
        <span className="text-xs opacity-80 inline-flex items-center gap-1 select-none">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.9), 0 0 16px rgba(239,68,68,0.5)' }}
          />
          LIVE
        </span>
      </div>
      <div ref={scrollerRef} className="mt-3 overflow-auto rounded-lg border border-white/5 bg-white/5 max-h-[60vh]">
        {lines.length === 0 ? (
          <div className="px-3 py-2 text-sm opacity-80">No analysis yet. Run ws feeder and pipe CLI (see README Live Demo).</div>
        ) : (
          <pre className="px-3 py-2 font-mono text-sm whitespace-pre leading-6 tabular-nums text-white/90">
            {lines.map((it, i) => (
              <React.Fragment key={i}>
                {renderLine(it.line)}{'\n'}
              </React.Fragment>
            ))}
          </pre>
        )}
      </div>
    </div>
  )
}
