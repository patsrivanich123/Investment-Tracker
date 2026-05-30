import { useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isConfigured) {
      setMsg({ type: 'error', text: 'Supabase not configured. Copy .env.example → .env and add your credentials.' })
      return
    }
    setLoading(true)
    setMsg(null)
    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else if (mode === 'signup') {
      setMsg({ type: 'success', text: 'Check your email to confirm your account, then sign in.' })
      setMode('signin')
    }
  }

  return (
    <div className="min-h-dvh bg-app-bg flex flex-col items-center justify-center px-6 safe-top">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-app-card border border-app-border rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-glow shadow-blue-900">
          <svg viewBox="0 0 40 40" className="w-9 h-9">
            <polyline points="2,32 10,20 20,24 30,10 38,6" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="2,32 10,26 20,30 30,18 38,14" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Investment Tracker</h1>
        <p className="text-slate-500 text-sm mt-1">40-year goal • weekly pulse</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-app-card border border-app-border rounded-3xl p-6 shadow-card">
        <h2 className="text-lg font-semibold text-slate-100 mb-5">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
              Email
            </label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-slate-100 text-base outline-none focus:border-blue-600 transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
              Password
            </label>
            <input
              type="password" required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-slate-100 text-base outline-none focus:border-blue-600 transition-colors"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {msg && (
            <div className={`text-sm rounded-xl px-4 py-3 ${
              msg.type === 'error'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {msg.text}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-semibold text-base active:scale-95 transition-transform disabled:opacity-50 mt-1"
          >
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setMsg(null) }}
          className="w-full text-center text-sm text-slate-500 mt-4 py-2"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>

      {!isConfigured && (
        <div className="mt-6 max-w-sm w-full bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-amber-400 text-sm font-medium mb-1">Setup required</p>
          <p className="text-amber-400/70 text-xs">
            Copy <code className="font-mono">.env.example</code> → <code className="font-mono">.env</code> and
            add your Supabase URL + anon key. Run the SQL in <code className="font-mono">supabase/schema.sql</code>.
          </p>
        </div>
      )}
    </div>
  )
}
