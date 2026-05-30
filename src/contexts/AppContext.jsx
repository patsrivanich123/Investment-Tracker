import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { accountMetrics, portfolioMetrics } from '../lib/metrics'

const Ctx = createContext(null)

const init = {
  user: null,
  profile: null,
  accounts: [],
  snapshots: [],
  loading: true,
}

function reducer(state, { type, payload }) {
  switch (type) {
    case 'SET_USER':     return { ...state, user: payload }
    case 'SET_PROFILE':  return { ...state, profile: payload }
    case 'SET_ACCOUNTS': return { ...state, accounts: payload }
    case 'SET_SNAPSHOTS':return { ...state, snapshots: payload }
    case 'UPSERT_SNAPSHOTS': {
      const incoming = Array.isArray(payload) ? payload : [payload]
      const filtered = state.snapshots.filter(
        s => !incoming.some(n => n.account_id === s.account_id && n.week_ending === s.week_ending)
      )
      return { ...state, snapshots: [...filtered, ...incoming] }
    }
    case 'SET_LOADING':  return { ...state, loading: payload }
    case 'READY':        return { ...state, loading: false }
    default: return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init)

  const loadUserData = useCallback(async (userId) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const [{ data: profile }, { data: accounts }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('accounts').select('*').eq('user_id', userId).order('sort_order'),
      ])
      dispatch({ type: 'SET_PROFILE', payload: profile })
      dispatch({ type: 'SET_ACCOUNTS', payload: accounts || [] })

      if (accounts?.length) {
        const { data: snaps } = await supabase
          .from('weekly_snapshots')
          .select('*')
          .in('account_id', accounts.map(a => a.id))
          .order('week_ending')
        dispatch({ type: 'SET_SNAPSHOTS', payload: snaps || [] })
      }
    } finally {
      dispatch({ type: 'READY' })
    }
  }, [])

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_USER', payload: session?.user ?? null })
      if (session?.user) loadUserData(session.user.id)
      else dispatch({ type: 'READY' })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      dispatch({ type: 'SET_USER', payload: session?.user ?? null })
      if (event === 'SIGNED_IN' && session?.user) loadUserData(session.user.id)
      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SET_ACCOUNTS', payload: [] })
        dispatch({ type: 'SET_SNAPSHOTS', payload: [] })
        dispatch({ type: 'SET_PROFILE', payload: null })
        dispatch({ type: 'READY' })
      }
    })
    return () => subscription.unsubscribe()
  }, [loadUserData])

  // ─── Actions ──────────────────────────────────────────────────────────

  const actions = {
    async signUp(email, password) {
      return supabase.auth.signUp({ email, password })
    },
    async signIn(email, password) {
      return supabase.auth.signInWithPassword({ email, password })
    },
    async signOut() {
      await supabase.auth.signOut()
    },

    async saveAccount(data) {
      const row = { ...data, user_id: state.user.id }
      const { data: acc, error } = data.id
        ? await supabase.from('accounts').update(row).eq('id', data.id).select().single()
        : await supabase.from('accounts').insert(row).select().single()
      if (!error) {
        const existing = state.accounts.filter(a => a.id !== acc.id)
        dispatch({ type: 'SET_ACCOUNTS', payload: [...existing, acc].sort((a, b) => a.sort_order - b.sort_order) })
      }
      return { data: acc, error }
    },

    async deleteAccount(id) {
      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (!error) {
        dispatch({ type: 'SET_ACCOUNTS', payload: state.accounts.filter(a => a.id !== id) })
        dispatch({ type: 'SET_SNAPSHOTS', payload: state.snapshots.filter(s => s.account_id !== id) })
      }
      return { error }
    },

    async saveSnapshots(rows) {
      // rows: array of {account_id, week_ending, ending_balance_thb, deposit_thb, withdrawal_thb, notes}
      const { data, error } = await supabase
        .from('weekly_snapshots')
        .upsert(rows, { onConflict: 'account_id,week_ending' })
        .select()
      if (!error && data) dispatch({ type: 'UPSERT_SNAPSHOTS', payload: data })
      return { data, error }
    },

    async updateProfile(updates) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', state.user.id)
        .select()
        .single()
      if (!error) dispatch({ type: 'SET_PROFILE', payload: data })
      return { data, error }
    },

    refresh() {
      if (state.user) loadUserData(state.user.id)
    },
  }

  // ─── Derived metrics (computed once, passed down) ─────────────────────

  const rfr = (state.profile?.risk_free_rate ?? 2.5) / 100
  const acctMetrics = state.accounts.reduce((acc, a) => {
    const snaps = state.snapshots.filter(s => s.account_id === a.id)
    acc[a.id] = accountMetrics(snaps, rfr)
    return acc
  }, {})
  const portMetrics = portfolioMetrics(state.snapshots, rfr)

  return (
    <Ctx.Provider value={{ ...state, actions, acctMetrics, portMetrics }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
