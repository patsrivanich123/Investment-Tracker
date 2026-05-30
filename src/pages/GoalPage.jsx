import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { fmtTHB, fmtUSD, fmtPct, pctColor, planYearFromStart, ageFromBirth } from '../lib/utils'
import {
  currentGoal, generateGoalCurve, goalForDates, PLAN_MILESTONES, planYear,
} from '../lib/goalCurve'
import GoalChart from '../components/charts/GoalChart'
import LoadingSpinner from '../components/LoadingSpinner'

export default function GoalPage() {
  const { profile, portMetrics, loading } = useApp()
  const [customRate, setCustomRate] = useState(null) // override annual rate for scenario

  if (loading) return <LoadingSpinner fullscreen />

  const startBalance = profile?.starting_balance_thb ?? 0
  const baseRate = profile?.goal_annual_return ?? 20
  const planStart = profile?.plan_start_date ?? '2026-05-15'
  const birthDate = profile?.birth_date ?? '2003-03-29'
  const rate = customRate ?? baseRate
  const usdRate = profile?.usd_thb_rate ?? 35

  const currentAUM = portMetrics?.currentAUM ?? 0
  const goalNow = startBalance > 0 ? currentGoal(startBalance, rate, planStart) : null
  const vsGoal = goalNow ? (currentAUM - goalNow) / goalNow : null
  const planYr = planYearFromStart(planStart)
  const age = ageFromBirth(birthDate)

  const goalCurve = startBalance > 0
    ? generateGoalCurve(startBalance, rate, planStart)
    : null

  // Align actual history with plan years
  const actualWithYears = portMetrics?.balanceHistory?.map(h => {
    const [yr, m, d] = h.date.split('-').map(Number)
    const hDate = new Date(yr, m - 1, d)
    const startDate = new Date(planStart)
    const yearInPlan = Math.max(0, (hDate - startDate) / (365.25 * 86400000))
    return { ...h, yearInPlan }
  }) ?? []

  // Projected end values at different rates
  const projections = [15, 20, 25].map(r => ({
    rate: r,
    value40: startBalance > 0
      ? startBalance * (1 + r / 100) ** 40
      : null,
  }))

  return (
    <div className="px-4 pt-12 pb-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Goal Tracker</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Age {age} · Plan Year {planYr.toFixed(2)} of 40
        </p>
      </div>

      {/* Status card */}
      <div className="bg-app-card border border-app-border rounded-3xl p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Current AUM</p>
            <p className="text-2xl font-bold font-mono text-slate-100 mt-0.5">
              {fmtTHB(currentAUM, { short: true })}
            </p>
            <p className="text-xs text-slate-500">{fmtUSD(currentAUM, usdRate)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
              Target @ {rate}% ({planYr.toFixed(1)}yr)
            </p>
            <p className="text-2xl font-bold font-mono text-slate-100 mt-0.5">
              {goalNow ? fmtTHB(goalNow, { short: true }) : '—'}
            </p>
            {goalNow && (
              <p className={`text-xs font-semibold font-mono ${pctColor(vsGoal)}`}>
                {vsGoal != null ? fmtPct(vsGoal) : ''} vs goal
              </p>
            )}
          </div>
        </div>

        {/* On-track indicator */}
        {vsGoal !== null && (
          <div className={`mt-4 text-sm font-semibold px-4 py-2.5 rounded-xl text-center ${
            vsGoal >= 0
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-red-500/10 text-red-400'
          }`}>
            {vsGoal >= 0
              ? `On track · ${fmtTHB(currentAUM - goalNow, { short: true })} ahead`
              : `Behind · ${fmtTHB(goalNow - currentAUM, { short: true })} to catch up`}
          </div>
        )}
      </div>

      {/* Rate scenario toggle */}
      <div className="bg-app-card border border-app-border rounded-2xl p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Scenario Rate Override</p>
        <div className="flex gap-2">
          {[null, 15, 20, 25, 30].map(r => (
            <button key={r ?? 'base'}
              onClick={() => setCustomRate(r)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                (r === null ? customRate === null : customRate === r)
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-app-bg border border-app-border text-slate-500'
              }`}
            >
              {r === null ? `${baseRate}%` : `${r}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Goal chart */}
      {goalCurve && (
        <div className="bg-app-card border border-app-border rounded-3xl p-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-amber-500" style={{ borderTop: '2px dashed #f59e0b', width: 16 }} />
              <span className="text-[10px] text-slate-500">Target {rate}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-blue-500 rounded" style={{ height: 2, width: 16 }} />
              <span className="text-[10px] text-slate-500">Actual</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
            40-Year Trajectory (log scale)
          </p>
          <GoalChart goalCurve={goalCurve} actualHistory={actualWithYears} height={240} />
        </div>
      )}

      {startBalance === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-sm text-amber-400">
          Set your starting balance in Settings to see the goal curve.
        </div>
      )}

      {/* Milestones */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium px-1">Plan Milestones (Total AUM)</p>
        {PLAN_MILESTONES.map(m => {
          const achieved = currentAUM >= m.thb
          const yearsLeft = m.year - planYr
          return (
            <div key={m.year}
              className={`bg-app-card border rounded-2xl p-4 flex items-center justify-between ${
                achieved ? 'border-emerald-500/30' : 'border-app-border'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-200">Year {m.year}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Age {Math.round(age + yearsLeft)} ·{' '}
                  {yearsLeft > 0 ? `${yearsLeft.toFixed(1)} yrs away` : 'reached'}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-base font-bold font-mono ${achieved ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {fmtTHB(m.thb, { short: true })}
                </p>
                <p className="text-xs text-slate-500">{fmtUSD(m.thb, usdRate)}</p>
              </div>
              {achieved && (
                <span className="ml-3 text-emerald-400 text-lg">✓</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Projections */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium px-1 mb-2">
          Yr 40 Projection (from current balance)
        </p>
        <div className="space-y-2">
          {[15, 20, 25].map(r => {
            const yearsLeft = 40 - planYr
            const projected = currentAUM * (1 + r / 100) ** yearsLeft
            return (
              <div key={r} className="bg-app-card border border-app-border rounded-2xl p-4 flex justify-between items-center">
                <span className="text-sm text-slate-400">{r}% CAGR · {yearsLeft.toFixed(1)} yrs</span>
                <div className="text-right">
                  <p className="text-base font-bold font-mono text-slate-100">
                    {fmtTHB(projected, { short: true })}
                  </p>
                  <p className="text-xs text-slate-500">{fmtUSD(projected, usdRate)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
