import { parseDate } from './utils'

// ─── Total-AUM milestones from the 40-year plan chart ────────────────────
export const PLAN_MILESTONES = [
  { year: 10, thb: 10_000_000,      label: 'Yr 10 — ฿10M ($288K)' },
  { year: 20, thb: 323_000_000,     label: 'Yr 20 — ฿323M ($9M)'  },
  { year: 30, thb: 3_148_000_000,   label: 'Yr 30 — ฿3.1B ($90M)' },
  { year: 40, thb: 24_548_000_000,  label: 'Yr 40 — ฿24.5B ($701M)'},
]

// LP injection schedule (plan-level, not personal)
export const LP_INJECTIONS = [
  { planYear: 6,  thb: 7_000_000 * 35,  label: '+7M LP'   },
  { planYear: 8,  thb: 20_000_000 * 35, label: '+20M LP'  },
  { planYear: 11, thb: 100_000_000 * 35,label: '+100M LP' },
]

// ─── Core math ────────────────────────────────────────────────────────────

export function weeklyRateFromAnnual(annualPct) {
  return (1 + annualPct / 100) ** (1 / 52) - 1
}

/** Goal balance for personal capital at week N from plan start */
export function goalAtWeek(startBalance, annualPct, weekN) {
  return startBalance * (1 + weeklyRateFromAnnual(annualPct)) ** weekN
}

/** Weeks elapsed since plan start (floored to 0) */
export function weeksSinceStart(planStartDate) {
  const start = typeof planStartDate === 'string' ? parseDate(planStartDate) : planStartDate
  const ms = Date.now() - start.getTime()
  return Math.max(0, Math.floor(ms / (7 * 86400000)))
}

/** Current goal balance */
export function currentGoal(startBalance, annualPct, planStartDate) {
  return goalAtWeek(startBalance, annualPct, weeksSinceStart(planStartDate))
}

/** Plan year (fractional) */
export function planYear(planStartDate) {
  return weeksSinceStart(planStartDate) / 52
}

/** Generate goal curve data for charts — ~300 points over 40 years */
export function generateGoalCurve(startBalance, annualPct, planStartDate) {
  const start = typeof planStartDate === 'string' ? parseDate(planStartDate) : planStartDate
  const totalWeeks = 40 * 52
  const step = Math.max(1, Math.floor(totalWeeks / 300))
  const points = []
  for (let w = 0; w <= totalWeeks; w += step) {
    const date = new Date(start.getTime() + w * 7 * 86400000)
    points.push({
      week: w,
      date: date.toISOString().split('T')[0],
      yearInPlan: w / 52,
      goal: goalAtWeek(startBalance, annualPct, w),
    })
  }
  return points
}

/** Generate goal curve aligned to actual snapshot dates */
export function goalForDates(startBalance, annualPct, planStartDate, dates) {
  const start = typeof planStartDate === 'string' ? parseDate(planStartDate) : planStartDate
  return dates.map(dateStr => {
    const d = typeof dateStr === 'string' ? parseDate(dateStr) : dateStr
    const weeks = Math.max(0, (d - start) / (7 * 86400000))
    return {
      date: typeof dateStr === 'string' ? dateStr : dateStr.toISOString().split('T')[0],
      goal: goalAtWeek(startBalance, annualPct, weeks),
    }
  })
}
