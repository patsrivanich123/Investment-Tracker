import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { fmtTHB } from '../lib/utils'
import LoadingSpinner from '../components/LoadingSpinner'

const ACCOUNT_PRESETS = [
  { name: 'dime',     display_name: 'Dime',     color: '#3b82f6', sort_order: 0 },
  { name: 'ibkr',     display_name: 'IBKR',     color: '#8b5cf6', sort_order: 1 },
  { name: 'ai_quant', display_name: 'AI-Quant', color: '#14b8a6', sort_order: 2 },
]

export default function SettingsPage() {
  const { accounts, profile, actions, loading, user } = useApp()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAcct, setNewAcct] = useState({ display_name: '', color: '#3b82f6', sort_order: 10, is_active: true })
  const [goalFields, setGoalFields] = useState(null) // null = use profile values

  if (loading) return <LoadingSpinner fullscreen />

  const f = goalFields ?? {
    plan_start_date: profile?.plan_start_date ?? '2026-05-15',
    goal_annual_return: profile?.goal_annual_return ?? 20,
    risk_free_rate: profile?.risk_free_rate ?? 2.5,
    usd_thb_rate: profile?.usd_thb_rate ?? 35,
    starting_balance_thb: profile?.starting_balance_thb ?? 0,
    birth_date: profile?.birth_date ?? '2003-03-29',
  }

  function setF(key, val) {
    setGoalFields(prev => ({ ...(prev ?? f), [key]: val }))
  }

  async function saveGoal() {
    if (!goalFields) return
    setSaving(true)
    const { error } = await actions.updateProfile(goalFields)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  async function addPreset(preset) {
    await actions.saveAccount({ ...preset })
  }

  async function toggleAccount(acc) {
    await actions.saveAccount({ ...acc, is_active: !acc.is_active })
  }

  async function deleteAccount(acc) {
    if (!confirm(`Delete ${acc.display_name}? This removes all its snapshots.`)) return
    await actions.deleteAccount(acc.id)
  }

  async function addCustomAccount() {
    if (!newAcct.display_name.trim()) return
    await actions.saveAccount({ ...newAcct, name: newAcct.display_name.toLowerCase().replace(/\s+/g, '_') })
    setShowAddAccount(false)
    setNewAcct({ display_name: '', color: '#3b82f6', sort_order: 10, is_active: true })
  }

  const existingNames = accounts.map(a => a.name)

  return (
    <div className="px-4 pt-12 pb-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5 font-mono">{user?.email}</p>
      </div>

      {/* ─── Goal Parameters ─────────────────────────────── */}
      <Section title="Goal Parameters">
        <Field label="Plan Start Date">
          <input type="date" value={f.plan_start_date}
            onChange={e => setF('plan_start_date', e.target.value)}
            className="input-base" />
        </Field>
        <Field label="Birth Date">
          <input type="date" value={f.birth_date}
            onChange={e => setF('birth_date', e.target.value)}
            className="input-base" />
        </Field>
        <Field label="Starting Balance (฿)" sub="Your portfolio value at plan start">
          <input type="number" inputMode="decimal" min="0" value={f.starting_balance_thb}
            onChange={e => setF('starting_balance_thb', parseFloat(e.target.value) || 0)}
            className="input-base font-mono" />
        </Field>
        <Field label="Target Annual Return (%)" sub="Used for goal curve (default 20%)">
          <input type="number" inputMode="decimal" min="1" max="99" value={f.goal_annual_return}
            onChange={e => setF('goal_annual_return', parseFloat(e.target.value) || 20)}
            className="input-base font-mono" />
        </Field>
        <Field label="Risk-Free Rate (%)" sub="For Sharpe calculation">
          <input type="number" inputMode="decimal" min="0" max="20" step="0.1" value={f.risk_free_rate}
            onChange={e => setF('risk_free_rate', parseFloat(e.target.value) || 2.5)}
            className="input-base font-mono" />
        </Field>
        <Field label="USD/THB Rate">
          <input type="number" inputMode="decimal" min="1" value={f.usd_thb_rate}
            onChange={e => setF('usd_thb_rate', parseFloat(e.target.value) || 35)}
            className="input-base font-mono" />
        </Field>

        <button onClick={saveGoal} disabled={saving || !goalFields}
          className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 text-white disabled:opacity-40'
          }`}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Goal Settings'}
        </button>
      </Section>

      {/* ─── Accounts ─────────────────────────────────────── */}
      <Section title="Accounts">
        {/* Existing accounts */}
        {accounts.map(acc => (
          <div key={acc.id}
            className="flex items-center gap-3 bg-app-bg border border-app-border rounded-2xl px-4 py-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: acc.color }} />
            <span className="flex-1 text-slate-200 font-medium">{acc.display_name}</span>
            <button
              onClick={() => toggleAccount(acc)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                acc.is_active
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {acc.is_active ? 'Active' : 'Inactive'}
            </button>
            <button onClick={() => deleteAccount(acc)}
              className="text-red-500/60 hover:text-red-400 p-1 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Quick-add presets */}
        <div className="space-y-2">
          <p className="text-xs text-slate-600">Quick add:</p>
          <div className="flex gap-2 flex-wrap">
            {ACCOUNT_PRESETS.filter(p => !existingNames.includes(p.name)).map(p => (
              <button key={p.name} onClick={() => addPreset(p)}
                className="flex items-center gap-1.5 bg-app-bg border border-app-border px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 active:scale-95 transition-transform">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                + {p.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom account form */}
        {showAddAccount ? (
          <div className="bg-app-bg border border-app-border rounded-2xl p-4 space-y-3">
            <input type="text" placeholder="Account name" value={newAcct.display_name}
              onChange={e => setNewAcct(p => ({ ...p, display_name: e.target.value }))}
              className="input-base" />
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500">Color</label>
              <input type="color" value={newAcct.color}
                onChange={e => setNewAcct(p => ({ ...p, color: e.target.value }))}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent" />
            </div>
            <div className="flex gap-2">
              <button onClick={addCustomAccount}
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform">
                Add
              </button>
              <button onClick={() => setShowAddAccount(false)}
                className="flex-1 bg-app-card border border-app-border text-slate-400 py-2 rounded-xl text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddAccount(true)}
            className="w-full border border-dashed border-app-border rounded-2xl py-3 text-sm text-slate-500 active:scale-95 transition-transform">
            + Custom account
          </button>
        )}
      </Section>

      {/* ─── Sign out ──────────────────────────────────────── */}
      <Section title="Account">
        <button onClick={() => actions.signOut()}
          className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm font-semibold active:scale-95 transition-transform">
          Sign Out
        </button>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium px-1">{title}</p>
      <div className="bg-app-card border border-app-border rounded-3xl p-4 space-y-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, sub, children }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 font-medium mb-1.5">
        {label}
        {sub && <span className="text-slate-600 font-normal ml-1">— {sub}</span>}
      </label>
      {children}
    </div>
  )
}
