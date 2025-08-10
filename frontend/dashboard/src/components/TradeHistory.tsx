import React, { useEffect, useRef, useState } from 'react'
import { createWS, WSMessage } from '../lib/ws'

export type TradeRow = {
  ts: number
  inst: string
  side: 'buy' | 'sell'
  size: number
  price: number
  txHash?: string
  zkVerified?: boolean
  proofHash?: string
}

export function TradeHistory() {
  const [rows, setRows] = useState<TradeRow[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const url = import.meta.env.VITE_WS_URL as string | undefined
    if (!url) return
    const ws = createWS(url, (msg: WSMessage) => {
      if (msg.type === 'trade') {
        const t = msg.payload as any
        const row: TradeRow = {
          ts: t.ts || Date.now(),
          inst: t.inst || '-',
          side: t.side || 'buy',
          size: Number(t.size || 0),
          price: Number(t.price || 0),
          txHash: t.txHash,
          zkVerified: !!t.zkVerified,
          proofHash: t.proofHash,
        }
        setRows((cur) => [row, ...cur].slice(0, 100))
      }
    })
    return () => ws.close()
  }, [])

  return (
    <div className="rounded-xl border border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trade History</h2>
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
          <span className="text-xs opacity-70">ZK-verified</span>
        </div>
      </div>
      <div ref={scrollRef} className="mt-3 overflow-x-auto overflow-y-auto max-h-72 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="text-left opacity-70">
            <tr>
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">Inst</th>
              <th className="py-2 pr-4">Side</th>
              <th className="py-2 pr-4">Size</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">ZK</th>
              <th className="py-2 pr-4">Tx</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="py-3" colSpan={7}>No trades yet. Stream via WebSocket "trade" messages.</td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="py-2 pr-4">{new Date(r.ts).toLocaleTimeString()}</td>
                <td className="py-2 pr-4">{r.inst}</td>
                <td className={"py-2 pr-4 " + (r.side === 'buy' ? 'text-emerald-400' : 'text-rose-400')}>{r.side}</td>
                <td className="py-2 pr-4">{r.size}</td>
                <td className="py-2 pr-4">{r.price}</td>
                <td className="py-2 pr-4">
                  {r.zkVerified ? (
                    <span title={r.proofHash} className="inline-flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-amber-400">Pending</span>
                  )}
                </td>
                <td className="py-2 pr-4 max-w-[180px] truncate">
                  {r.txHash ? (
                    <a className="text-sky-400 hover:underline" href={`https://etherscan.io/tx/${r.txHash}`} target="_blank" rel="noreferrer">{r.txHash}</a>
                  ) : (
                    <span className="opacity-60">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
