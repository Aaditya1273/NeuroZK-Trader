import React, { useEffect, useState } from 'react'
import { createWS, WSMessage } from '../lib/ws'
import { getAddress, getNativeBalance, getProvider } from '../lib/eth'

export function AccountHealth() {
  const [address, setAddress] = useState<string | null>(null)
  const [nativeBalance, setNativeBalance] = useState<string>('0')
  const [status, setStatus] = useState<'ok' | 'warn' | 'crit'>('ok')
  const [bundlerBacklog, setBundlerBacklog] = useState<number>(0)

  useEffect(() => {
    ;(async () => {
      const provider = await getProvider()
      const addr = await getAddress(provider as any)
      setAddress(addr)
      if (addr) setNativeBalance(await getNativeBalance(provider as any, addr))
    })()
  }, [])

  useEffect(() => {
    const url = import.meta.env.VITE_WS_URL as string | undefined
    if (!url) return
    const ws = createWS(url, (msg: WSMessage) => {
      if (msg.type === 'health') {
        const h = msg.payload || {}
        if (typeof h.bundlerBacklog === 'number') setBundlerBacklog(h.bundlerBacklog)
        if (h.status === 'ok' || h.status === 'warn' || h.status === 'crit') setStatus(h.status)
        if (h.nativeBalance) setNativeBalance(String(h.nativeBalance))
      }
    })
    return () => ws.close()
  }, [])

  const color = status === 'ok' ? 'text-emerald-400' : status === 'warn' ? 'text-amber-400' : 'text-rose-400'

  return (
    <div className="glass-card neon-border glass-hover shimmer anim-slide-in anim-delay-2 p-5">
      <h2 className="text-lg font-semibold heading-gradient">Account Health</h2>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="opacity-70">Status</span>
          <span className={color + ' inline-flex items-center gap-2'}>
            <span className={`pulse-dot ${status === 'ok' ? '!bg-emerald-400' : status === 'warn' ? '!bg-amber-400' : '!bg-rose-400'}`} />
            {status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="opacity-70">Address</span>
          <span className="truncate max-w-[200px] text-xs">{address ?? 'Not connected'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="opacity-70">Native Balance</span>
          <span>{Number(nativeBalance).toFixed(6)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="opacity-70">Bundler Backlog</span>
          <span>{bundlerBacklog}</span>
        </div>
      </div>
      <p className="mt-3 text-xs opacity-70">Tip: set VITE_WS_URL to stream live health metrics.</p>
    </div>
  )
}
