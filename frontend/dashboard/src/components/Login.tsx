import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { login } = useAuth()
  const [address, setAddress] = useState('')
  const [pk, setPk] = useState('')
  const [password, setPassword] = useState('')
  const [showPk, setShowPk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (!address || !pk || !password) throw new Error('All fields are required')
      await login({ address, privateKey: pk, password })
    } catch (err: any) {
      setError(err?.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#16213e]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_70%_20%,rgba(147,51,234,0.4)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_20%_80%,rgba(168,85,247,0.35)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_90%_70%,rgba(124,58,237,0.3)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_150%_100%_at_50%_0%,rgba(99,102,241,0.25)_0%,transparent_70%)]" />
        <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_25%_25%,rgba(139,92,246,0.2)_0%,transparent_50%)]" />
        <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_75%_75%,rgba(168,85,247,0.18)_0%,transparent_50%)]" style={{animationDelay: '1s'}} />
        <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15)_0%,transparent_60%)]" style={{animationDelay: '2s'}} />
      </div>

      {/* Floating Glass Particles */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-20 w-16 h-16 bg-purple-500/25 backdrop-blur-sm border border-white/20 rounded-2xl animate-bounce shadow-lg shadow-purple-500/20" style={{animationDelay: '0s', animationDuration: '3s'}} />
        <div className="absolute bottom-1/3 left-16 w-12 h-12 bg-violet-500/25 backdrop-blur-sm border border-white/20 rounded-xl animate-bounce shadow-lg shadow-violet-500/20" style={{animationDelay: '1s', animationDuration: '4s'}} />
        <div className="absolute top-1/2 right-1/4 w-8 h-8 bg-indigo-500/25 backdrop-blur-sm border border-white/20 rounded-lg animate-bounce shadow-lg shadow-indigo-500/20" style={{animationDelay: '2s', animationDuration: '5s'}} />
        <div className="absolute top-1/3 left-1/3 w-10 h-10 bg-blue-500/20 backdrop-blur-sm border border-white/15 rounded-xl animate-bounce shadow-lg shadow-blue-500/15" style={{animationDelay: '3s', animationDuration: '6s'}} />
        <div className="absolute bottom-1/4 right-1/3 w-6 h-6 bg-cyan-500/20 backdrop-blur-sm border border-white/15 rounded-lg animate-bounce shadow-lg shadow-cyan-500/15" style={{animationDelay: '4s', animationDuration: '7s'}} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-lg">
          {/* Glassmorphism Login Card */}
          <div className="relative group">
            {/* Animated Border Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse" />
            
            <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl px-10 py-6 shadow-2xl">
              {/* Header with Logo */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-3 bg-gradient-to-br from-purple-500/20 to-violet-600/20 backdrop-blur-sm border border-white/10 rounded-xl">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-violet-600 rounded-md shadow-lg" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-violet-200 bg-clip-text text-transparent mb-1">
                  Secure Wallet Login
                </h2>
                <p className="text-white/60 text-xs">
                  Access your NeuroZK Trading Dashboard
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {/* Wallet Address Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/80">
                    Wallet Address
                  </label>
                  <div className="relative group">
                    <input
                      className="relative z-10 w-full px-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 group-hover:bg-white/10"
                      placeholder="0x..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      autoComplete="off"
                    />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                </div>

                {/* Private Key Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/80">
                    Private Key
                  </label>
                  <div className="relative group">
                    <input
                      className="relative z-10 w-full px-4 py-2.5 pr-16 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 group-hover:bg-white/10"
                      placeholder="0x..."
                      value={pk}
                      type={showPk ? 'text' : 'password'}
                      onChange={(e) => setPk(e.target.value)}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPk((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 px-2 py-1 text-xs font-medium text-purple-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-all duration-200"
                    >
                      {showPk ? 'Hide' : 'Show'}
                    </button>
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                  <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Encrypted in browser (AES-256-GCM). Never sent to backend.
                  </p>
                </div>

                {/* Encryption Password Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/80">
                    Encryption Password
                  </label>
                  <div className="relative group">
                    <input
                      className="relative z-10 w-full px-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 group-hover:bg-white/10"
                      placeholder="Strong password"
                      value={password}
                      type="password"
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-2.5 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-red-300 text-xs">
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full group overflow-hidden mt-5"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-violet-600 rounded-lg opacity-100 group-hover:opacity-90 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative px-6 py-2.5 font-semibold text-white flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Encrypting…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Login Securely
                      </>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-lg bg-white/20 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                </button>
              </form>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/50 text-center flex items-center justify-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Auto-logout after 15 minutes of inactivity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
