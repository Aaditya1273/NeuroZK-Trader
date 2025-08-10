import React, { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { Wallet, JsonRpcProvider } from 'ethers'
import { encryptPrivateKey, EncryptedBlob } from '../lib/browserCrypto'

type AuthState = {
  address: string | null
  wallet: Wallet | null // in-memory only
  isAuthenticated: boolean
}

type AuthContextType = AuthState & {
  login: (params: { address: string; privateKey: string; password: string }) => Promise<void>
  switchWallet: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_KEY = 'encKeyV1'
const IDLE_MS = 15 * 60 * 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearIdle = () => {
    if (idleRef.current) clearTimeout(idleRef.current)
    idleRef.current = null
  }

  const resetIdle = useCallback(() => {
    clearIdle()
    idleRef.current = setTimeout(() => {
      // Auto-logout: wipe memory and session
      sessionStorage.removeItem(SESSION_KEY)
      setWallet(null)
      setAddress(null)
    }, IDLE_MS)
  }, [])

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart']
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true } as any))
    resetIdle()
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle))
      clearIdle()
    }
  }, [resetIdle])

  // Auto-bootstrap from ENV (demo/dev convenience):
  // If VITE_WALLET_PK (or VITE_DEMO_PK) is present, initialize a wallet automatically.
  useEffect(() => {
    if (wallet || address) return
    const envAny = (import.meta as any).env || {}
    const pk: string | undefined = envAny.VITE_WALLET_PK || envAny.VITE_DEMO_PK
    if (!pk) return
    const rpc: string = envAny.VITE_PUBLIC_RPC || 'https://rpc.ankr.com/eth'
    try {
      const provider = new JsonRpcProvider(rpc)
      const w = new Wallet(pk.trim(), provider)
      setWallet(w)
      setAddress(w.address)
      resetIdle()
    } catch (e) {
      console.warn('ENV wallet bootstrap failed:', e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async ({ address, privateKey, password }: { address: string; privateKey: string; password: string }) => {
    // Encrypt PK and store in sessionStorage
    const blob: EncryptedBlob = await encryptPrivateKey(privateKey.trim(), password)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(blob))

    // Decrypt into memory and create wallet bound to RPC
    const rpc = (import.meta as any).env?.VITE_PUBLIC_RPC || 'https://rpc.ankr.com/eth'
    const provider = new JsonRpcProvider(rpc)
    const w = new Wallet(privateKey.trim(), provider)
    setWallet(w)
    setAddress(address.trim())
    resetIdle()
  }, [resetIdle])

  const switchWallet = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setWallet(null)
    setAddress(null)
  }, [])

  const value = useMemo<AuthContextType>(() => ({
    address,
    wallet,
    isAuthenticated: !!wallet && !!address,
    login,
    switchWallet,
  }), [address, wallet, login, switchWallet])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
