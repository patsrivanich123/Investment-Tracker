import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { useSearchParams } from 'react-router-dom'
import { fmtTHB, fmtPct, fmtUSD, pctColor, pctBg } from '../lib/utils'
import PortfolioChart from '../components/charts/PortfolioChart'
import WeeklyReturnsChart from '../components/charts/WeeklyReturnsChart'
import DrawdownChart from '../components/charts/DrawdownChart'
import MetricCard from '../components/MetricCard'
import LoadingSpinner from '../components/LoadingSpinner'

const PERIODS = [
  { label: '1M', weeks: 4 },
  { label: '3M', weeks: 13 },
  { label: '6M', weeks: 26 },
  { label: 'YTD', weeks: null },
  { label: 'All', weeks: null },
]

export default function AnalyticsPage() {
  const { accounts, acctMetrics, portMetrics, profile, loading } = useApp()
  const [params] = useSearchParams()
  const preselect = params.get('account')

  const [selectedId, setSelectedId] = useState(preselect ?? 'all')
  const [period, setPeriod] = useState('All')

  if (loading) return <LoadingSpinner fullscreen />

  const activeAccounts = accounts.filter(a => a.is_active)

  const metrics = selectedId === 'all'
    ? portMetrics
    : acctMetrics[selectedId]

  const selectedAccount = accounts.find(a => a.id === selectedId)
  const rate = profile?.usd_thb_rate ?? 35

  // Period filter on balance history
  const filteredHistory = (() => {
    if (!metrics?.balanceHistory?.length) return []
    const p = PERIODS.find(x => x.label === period)
    if (!p?.weeks) return metrics.balanceHistory
    return metrics.balanceHistory.slice(-p.weeks)
  })()

  return (
    <div className="px-4 pt-12 pb-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-100">Analytics</h1>

      {/* Account selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <Chip label="All" active={selectedId === 'all'} onClick={() => setSelectedId('all')} color="#3b82f6" />
        {activeAccounts.map(acc => (
          <Chip key={acc.id} label={acc.display_name} active={selectedId === acc.id}
            onClick={() => setSelectedId(acc.id)} color={acc.color} />
        ))}
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button key={p.label}
            onClick={() => setPeriod(p.label)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              period === p.label
                ? 'bg-blue-600 text-white'
                : 'bg-app-card border border-app-border text-slate-400'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!metrics ? (
        <div className="bg-app-card border border-app-border rounded-3xl p-8 text-center text-slate-500 text-sm">
          No data yet for this account.
        </div>
      ) : (
        <>
          {/* Current balance */}
          <div className="bg-app-card border border-app-border rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-2">
              {selectedAccount && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedAccount.color }} />}
              <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                {selectedAccount?.display_name ?? 'Portfolio'}
              </span>
            </div>
            <p className="text-3xl font-bold font-mono text-slate-100">
              {fmtTHB(metrics.currentAUM ?? metrics.currentBalance, { short: true })}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {fmtUSD(metrics.currentAUM ?? metrics.currentBalance ?? 0, rate)}
            </p>
            {metrics.lastWeekReturn != null && (
              <span className={`inline-block mt-2 text-sm font-mono font-semibold px-2.5 py-1 rounded-lg ${pctBg(metrics.lastWeekReturn)}`}>
                {fmtPct(metrics.lastWeekReturn)} this week
              </span>
            )}
          </div>

          {/* AUM Chart */}
          {filteredHistory.length > 1 && (
            <div className="bg-app-card border border-app-border rounded-3xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Balance</p>
              <PortfolioChart data={filteredHistory} accounts={activeAccounts} />
            </div>
          )}

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Ann. Return" value={fmtPct(metrics.annReturn)}
              highlight={pctColor(metrics.annReturn)} />
            <MetricCard label="Sharpe Ratio" value={metrics.sharpe?.toFixed(2) ?? '—'}
              sub="need ≥8 weeks" highlight={metrics.sharpe != null && metrics.sharpe > 1 ? 'text-emerald-400' : undefined} />
            <MetricCard label="Ann. Volatility" value={fmtPct(metrics.vol)}
              highlight="text-slate-100" />
            <MetricCard label="Max Drawdown" value={metrics.maxDrawdown != null ? fmtPct(-metrics.maxDrawdown) : '—'}
              highlight={metrics.maxDrawdown > 0 ? 'text-red-400' : 'text-emerald-400'} />
            {metrics.xirr != null && (
              <MetricCard label="XIRR" value={fmtPct(metrics.xirr)}
                sub="incl. cash flows" highlight={pctColor(metrics.xirr)} />
            )}
            {metrics.winRate != null && (
              <MetricCard label="Win Rate" value={fmtPct(metrics.winRate, 0, false)}
                sub={`${metrics.weekCount} weeks`} />
            )}
          </div>

          {/* Best / Worst */}
          {(metrics.bestWeek != null || metrics.worstWeek != null) && (
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Best Week" value={fmtPct(metrics.bestWeek)}
                highlight="text-emerald-400" small />
              <MetricCard label="Worst Week" value={fmtPct(metrics.worstWeek)}
                highlight="text-red-400" small />
            </div>
          )}

          {/* Weekly returns bar chart */}
          {filteredHistory.length > 2 && (
            <div className="bg-app-card border border-app-border rounded-3xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Weekly Returns</p>
              <WeeklyReturnsChart balanceHistory={filteredHistory} />
            </div>
          )}

          {/* Drawdown chart */}
          {filteredHistory.length > 2 && (
            <div className="bg-app-card border border-app-border rounded-3xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Drawdown</p>
              <DrawdownChart balanceHistory={filteredHistory} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Chip({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
        active
          ? 'bg-app-card border text-slate-100'
          : 'bg-app-card border border-app-border text-slate-500'
      }`}
      style={active ? { borderColor: color + '80' } : {}}
    >
      {active && color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </button>
  )
}
