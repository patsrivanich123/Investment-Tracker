import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { fmtTHB, fmtUSD, fmtPct, pctColor, planYearFromStart, ageFromBirth } from '../lib/utils'
import { currentGoal, PLAN_MILESTONES } from '../lib/goalCurve'
import AccountCard from '../components/AccountCard'
import PortfolioChart from '../components/charts/PortfolioChart'
import LoadingSpinner from '../components/LoadingSpinner'

export default function DashboardPage() {
  const { accounts, profile, portMetrics, acctMetrics, loading } = useApp()
  const navigate = useNavigate()

  if (loading) return <LoadingSpinner fullscreen />

  const rate = profile?.usd_thb_rate ?? 35
  const startBalance = profile?.starting_balance_thb ?? 0
  const goalAnnual = profile?.goal_annual_return ?? 20
  const planStart = profile?.plan_start_date ?? '2026-05-15'
  const birthDate = profile?.birth_date ?? '2003-03-29'

  const currentAUM = portMetrics?.currentAUM ?? 0
  const goalNow = startBalance > 0 ? currentGoal(startBalance, goalAnnual, planStart) : null
  const vsGoal = goalNow ? (currentAUM - goalNow) / goalNow : null

  const weekRet = portMetrics?.lastWeekReturn ?? null
  const planYr = planYearFromStart(planStart)
  const age = ageFromBirth(birthDate)

  const activeAccounts = accounts.filter(a => a.is_active)
  const nextMilestone = PLAN_MILESTONES.find(m => m.year > planYr)

  return (
    <div className="px-4 pt-12 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Portfolio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Age {age} · Plan Yr {planYr.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => navigate('/entry')}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-transform"
        >
          + Log Week
        </button>
      </div>

      {/* Total AUM card */}
      <div className="bg-app-card border border-app-border rounded-3xl p-5">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Total AUM</p>
        <p className="text-4xl font-bold font-mono text-slate-100">
          {fmtTHB(currentAUM, { short: true })}
        </p>
        <p className="text-sm text-slate-500 mt-0.5">{fmtUSD(currentAUM, rate)}</p>

        <div className="flex gap-4 mt-4">
          {weekRet !== null && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">This Week</p>
              <p className={`text-lg font-bold font-mono ${pctColor(weekRet)}`}>
                {fmtPct(weekRet)}
              </p>
            </div>
          )}
          {portMetrics?.annReturn != null && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Annualized</p>
              <p className={`text-lg font-bold font-mono ${pctColor(portMetrics.annReturn)}`}>
                {fmtPct(portMetrics.annReturn)}
              </p>
            </div>
          )}
          {vsGoal !== null && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">vs Goal</p>
              <p className={`text-lg font-bold font-mono ${pctColor(vsGoal)}`}>
                {fmtPct(vsGoal)}
              </p>
            </div>
          )}
        </div>

        {/* Goal progress bar */}
        {goalNow !== null && goalNow > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Goal: {fmtTHB(goalNow, { short: true })}</span>
              {nextMilestone && (
                <span>{nextMilestone.label}</span>
              )}
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  currentAUM >= goalNow ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (currentAUM / goalNow) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Portfolio chart */}
      {portMetrics?.balanceHistory?.length > 1 && (
        <div className="bg-app-card border border-app-border rounded-3xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">AUM History</p>
          <PortfolioChart data={portMetrics.balanceHistory} accounts={activeAccounts} />
        </div>
      )}

      {/* Account cards */}
      {accounts.length === 0 ? (
        <EmptyState navigate={navigate} />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium px-1">Accounts</p>
          {accounts.map(acc => (
            <AccountCard
              key={acc.id}
              account={acc}
              metrics={acctMetrics[acc.id]}
              usdRate={rate}
              onClick={() => navigate(`/analytics?account=${acc.id}`)}
            />
          ))}
        </div>
      )}

      {/* Quick stats row */}
      {portMetrics && (
        <div className="grid grid-cols-3 gap-3">
          <StatChip label="Sharpe" value={portMetrics.sharpe != null ? portMetrics.sharpe.toFixed(2) : '—'} />
          <StatChip label="Max DD" value={portMetrics.maxDrawdown != null ? fmtPct(-portMetrics.maxDrawdown, 1) : '—'}
            color={portMetrics.maxDrawdown > 0 ? 'text-red-400' : 'text-slate-100'} />
          <StatChip label="Win Rate" value={portMetrics.winRate != null ? fmtPct(portMetrics.winRate, 0, false) : '—'} />
        </div>
      )}
    </div>
  )
}

function StatChip({ label, value, color = 'text-slate-100' }) {
  return (
    <div className="bg-app-card border border-app-border rounded-2xl p-3 text-center">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold font-mono mt-0.5 ${color}`}>{value}</p>
    </div>
  )
}

function EmptyState({ navigate }) {
  return (
    <div className="bg-app-card border border-app-border rounded-3xl p-8 text-center">
      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p className="text-slate-300 font-semibold mb-1">No accounts yet</p>
      <p className="text-slate-500 text-sm mb-4">Add your Dime, IBKR accounts to start tracking</p>
      <button
        onClick={() => navigate('/settings')}
        className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform"
      >
        Add Accounts
      </button>
    </div>
  )
}
