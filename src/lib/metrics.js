import { parseDate } from './utils'

// ─── Single-period return (excludes end-of-period deposits) ───────────────
export function weeklyReturn(ending, prevEnding, deposit = 0, withdrawal = 0) {
  if (!prevEnding || prevEnding === 0) return null
  return (ending - prevEnding - deposit + withdrawal) / prevEnding
}

// ─── Annualized return from weekly returns ────────────────────────────────
export function annualizedReturn(weeklyReturns) {
  if (!weeklyReturns.length) return null
  const compounded = weeklyReturns.reduce((p, r) => p * (1 + r), 1)
  return Math.pow(compounded, 52 / weeklyReturns.length) - 1
}

// ─── Annualized volatility from weekly returns ────────────────────────────
export function annualizedVol(weeklyReturns) {
  if (weeklyReturns.length < 2) return null
  const mean = weeklyReturns.reduce((a, b) => a + b, 0) / weeklyReturns.length
  const variance =
    weeklyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (weeklyReturns.length - 1)
  return Math.sqrt(variance * 52)
}

// ─── Sharpe ratio (annualized, weekly inputs) ─────────────────────────────
export function sharpeRatio(weeklyReturns, annualRFR = 0.025) {
  if (weeklyReturns.length < 8) return null
  const weeklyRFR = (1 + annualRFR) ** (1 / 52) - 1
  const excess = weeklyReturns.map(r => r - weeklyRFR)
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length
  const variance = excess.reduce((s, r) => s + (r - mean) ** 2, 0) / (excess.length - 1)
  const annVol = Math.sqrt(variance * 52)
  if (annVol === 0) return null
  const annExcess = (1 + mean + weeklyRFR) ** 52 - 1 - annualRFR
  return annExcess / annVol
}

// ─── Maximum drawdown ─────────────────────────────────────────────────────
export function maxDrawdown(balances) {
  let peak = 0, maxDD = 0
  const series = balances.map(b => {
    if (b > peak) peak = b
    const dd = peak > 0 ? (peak - b) / peak : 0
    if (dd > maxDD) maxDD = dd
    return dd
  })
  return { maxDrawdown: maxDD, series }
}

// ─── XIRR (Newton-Raphson) ────────────────────────────────────────────────
// cashFlows: number[] — negative = outflows, positive = inflows
// dates: Date[]
export function xirr(cashFlows, dates) {
  if (cashFlows.length < 2) return null
  const refMs = dates[0].getTime()
  const years = dates.map(d => (d.getTime() - refMs) / (365.25 * 86400000))

  const npv = r => cashFlows.reduce((s, cf, i) => s + cf / (1 + r) ** years[i], 0)
  const dnpv = r =>
    cashFlows.reduce((s, cf, i) => s - (years[i] * cf) / (1 + r) ** (years[i] + 1), 0)

  let rate = 0.1
  for (let i = 0; i < 200; i++) {
    const d = dnpv(rate)
    if (!d || !isFinite(d)) break
    const next = rate - npv(rate) / d
    if (!isFinite(next)) break
    if (Math.abs(next - rate) < 1e-8) return next
    rate = next
  }
  return rate
}

// ─── Per-account metrics ──────────────────────────────────────────────────
export function accountMetrics(snapshots, annualRFR = 0.025) {
  if (!snapshots.length) return null
  const sorted = [...snapshots].sort((a, b) => a.week_ending.localeCompare(b.week_ending))

  const rets = []
  for (let i = 1; i < sorted.length; i++) {
    const r = weeklyReturn(
      sorted[i].ending_balance_thb,
      sorted[i - 1].ending_balance_thb,
      sorted[i].deposit_thb || 0,
      sorted[i].withdrawal_thb || 0,
    )
    if (r !== null) rets.push(r)
  }

  const balances = sorted.map(s => s.ending_balance_thb)
  const { maxDrawdown: maxDD, series: ddSeries } = maxDrawdown(balances)

  // XIRR cash flows
  const startBal = sorted[0].ending_balance_thb
  const currBal = sorted[sorted.length - 1].ending_balance_thb
  const xCFs = [-startBal]
  const xDates = [parseDate(sorted[0].week_ending)]
  for (let i = 1; i < sorted.length; i++) {
    const dep = sorted[i].deposit_thb || 0
    if (dep > 0) {
      xCFs.push(-dep)
      xDates.push(parseDate(sorted[i].week_ending))
    }
  }
  xCFs.push(currBal)
  xDates.push(parseDate(sorted[sorted.length - 1].week_ending))

  const totalDeposited = sorted.reduce((s, snap) => s + (snap.deposit_thb || 0), startBal)

  return {
    currentBalance: currBal,
    weeklyReturns: rets,
    balanceHistory: sorted.map((s, i) => ({
      date: s.week_ending,
      balance: s.ending_balance_thb,
      drawdown: ddSeries[i] || 0,
    })),
    annReturn: annualizedReturn(rets),
    vol: annualizedVol(rets),
    sharpe: sharpeRatio(rets, annualRFR),
    maxDrawdown: maxDD,
    xirr: xirr(xCFs, xDates),
    totalDeposited,
    lastWeekReturn: rets[rets.length - 1] ?? null,
    bestWeek: rets.length ? Math.max(...rets) : null,
    worstWeek: rets.length ? Math.min(...rets) : null,
    winRate: rets.length ? rets.filter(r => r > 0).length / rets.length : null,
    weekCount: rets.length,
  }
}

// ─── Consolidated portfolio metrics ──────────────────────────────────────
export function portfolioMetrics(allSnapshots, annualRFR = 0.025) {
  if (!allSnapshots.length) return null

  const dates = [...new Set(allSnapshots.map(s => s.week_ending))].sort()
  const history = dates.map(date => {
    const snaps = allSnapshots.filter(s => s.week_ending === date)
    return {
      date,
      balance: snaps.reduce((s, x) => s + (x.ending_balance_thb || 0), 0),
      deposit: snaps.reduce((s, x) => s + (x.deposit_thb || 0), 0),
    }
  })

  const rets = []
  for (let i = 1; i < history.length; i++) {
    const r = weeklyReturn(history[i].balance, history[i - 1].balance, history[i].deposit)
    if (r !== null) rets.push(r)
  }

  const { maxDrawdown: maxDD, series: ddSeries } = maxDrawdown(history.map(h => h.balance))

  return {
    currentAUM: history[history.length - 1]?.balance || 0,
    weeklyReturns: rets,
    balanceHistory: history.map((h, i) => ({ ...h, drawdown: ddSeries[i] || 0 })),
    annReturn: annualizedReturn(rets),
    vol: annualizedVol(rets),
    sharpe: sharpeRatio(rets, annualRFR),
    maxDrawdown: maxDD,
    lastWeekReturn: rets[rets.length - 1] ?? null,
    bestWeek: rets.length ? Math.max(...rets) : null,
    worstWeek: rets.length ? Math.min(...rets) : null,
    winRate: rets.length ? rets.filter(r => r > 0).length / rets.length : null,
    weekCount: rets.length,
  }
}
