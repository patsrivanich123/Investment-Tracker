import { useState, useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import { fmtTHB, getLastFriday, toISODate, parseDate } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

export default function EntryPage() {
  const { accounts, snapshots, actions } = useApp()
  const navigate = useNavigate()

  const defaultDate = toISODate(getLastFriday())
  const [weekDate, setWeekDate] = useState(defaultDate)
  const [entries, setEntries] = useState({}) // accountId → { balance, deposit, notes }
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const activeAccounts = accounts.filter(a => a.is_active)

  // Pre-fill with existing snapshot for the selected date
  const existing = useMemo(() => {
    const map = {}
    for (const s of snapshots) {
      if (s.week_ending === weekDate) map[s.account_id] = s
    }
    return map
  }, [snapshots, weekDate])

  // Previous week snapshot for return preview
  const prevSnapshot = useMemo(() => {
    const map = {}
    for (const acc of activeAccounts) {
      const accSnaps = snapshots
        .filter(s => s.account_id === acc.id && s.week_ending < weekDate)
        .sort((a, b) => b.week_ending.localeCompare(a.week_ending))
      map[acc.id] = accSnaps[0] ?? null
    }
    return map
  }, [snapshots, weekDate, activeAccounts])

  function getEntry(id) {
    return entries[id] ?? {
      balance: existing[id]?.ending_balance_thb?.toString() ?? '',
      deposit: existing[id]?.deposit_thb?.toString() ?? '0',
      notes: existing[id]?.notes ?? '',
    }
  }

  function setField(id, field, value) {
    setEntries(prev => ({
      ...prev,
      [id]: { ...getEntry(id), [field]: value },
    }))
  }

  function computeReturn(id) {
    const e = getEntry(id)
    const balance = parseFloat(e.balance)
    const deposit = parseFloat(e.deposit) || 0
    const prev = prevSnapshot[id]?.ending_balance_thb ?? 0
    if (!prev || isNaN(balance)) return null
    return (balance - prev - deposit) / prev
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const rows = activeAccounts
        .map(acc => {
          const e = getEntry(acc.id)
          const balance = parseFloat(e.balance)
          if (isNaN(balance) || balance < 0) return null
          return {
            account_id: acc.id,
            week_ending: weekDate,
            ending_balance_thb: balance,
            deposit_thb: parseFloat(e.deposit) || 0,
            withdrawal_thb: 0,
            notes: e.notes || null,
          }
        })
        .filter(Boolean)

      if (!rows.length) {
        setError('Enter at least one account balance.')
        return
      }

      const { error } = await actions.saveSnapshots(rows)
      if (error) throw error
      setSaved(true)
      setTimeout(() => navigate('/'), 1200)
    } catch (err) {
      setError(err.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (activeAccounts.length === 0) {
    return (
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-slate-100 mb-2">Log Week</h1>
        <div className="bg-app-card border border-app-border rounded-3xl p-8 text-center mt-8">
          <p className="text-slate-400 mb-4">Add accounts in Settings first.</p>
          <button onClick={() => navigate('/settings')}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-12 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Log Week</h1>
          <p className="text-xs text-slate-500 mt-0.5">End-of-day Friday balances</p>
        </div>
      </div>

      {/* Date picker */}
      <div className="bg-app-card border border-app-border rounded-2xl p-4">
        <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Week Ending (Friday)</label>
        <input
          type="date" value={weekDate}
          onChange={e => { setWeekDate(e.target.value); setEntries({}) }}
          className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-slate-100 text-base outline-none focus:border-blue-600 transition-colors"
        />
      </div>

      {/* Account rows */}
      {activeAccounts.map(acc => {
        const e = getEntry(acc.id)
        const prev = prevSnapshot[acc.id]
        const weekRet = computeReturn(acc.id)
        const isFirst = !prev

        return (
          <div key={acc.id} className="bg-app-card border border-app-border rounded-3xl p-5 space-y-4">
            {/* Account header */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: acc.color }} />
              <span className="font-semibold text-slate-100">{acc.display_name}</span>
              {prev && (
                <span className="text-xs text-slate-600 ml-auto">
                  prev: {fmtTHB(prev.ending_balance_thb, { short: true })}
                </span>
              )}
              {isFirst && (
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full ml-auto">
                  first entry
                </span>
              )}
            </div>

            {/* Ending balance */}
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">
                Ending Balance (฿)
              </label>
              <input
                type="number" inputMode="decimal" min="0" step="any"
                value={e.balance}
                onChange={ev => setField(acc.id, 'balance', ev.target.value)}
                placeholder={prev ? fmtTHB(prev.ending_balance_thb, { short: true }) : '0'}
                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-slate-100 text-lg font-mono outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Deposit */}
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">
                New Cash Deposited (฿)
              </label>
              <input
                type="number" inputMode="decimal" min="0" step="any"
                value={e.deposit}
                onChange={ev => setField(acc.id, 'deposit', ev.target.value)}
                placeholder="0"
                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-slate-100 text-base font-mono outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Live return preview */}
            {weekRet !== null && (
              <div className={`text-sm font-mono font-semibold px-3 py-2 rounded-xl ${
                weekRet >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                Week return: {weekRet >= 0 ? '+' : ''}{(weekRet * 100).toFixed(2)}%
              </div>
            )}

            {/* Notes */}
            <input
              type="text"
              value={e.notes}
              onChange={ev => setField(acc.id, 'notes', ev.target.value)}
              placeholder="Notes (optional)"
              className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-slate-300 text-sm outline-none focus:border-slate-600 transition-colors"
            />
          </div>
        )
      })}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSave} disabled={saving || saved}
        className={`w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-blue-600 text-white disabled:opacity-50'
        }`}
      >
        {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Week'}
      </button>
    </div>
  )
}
