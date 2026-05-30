// ─── Number Formatting ─────────────────────────────────────────────────────

export function fmtTHB(value, opts = {}) {
  if (value == null || isNaN(value)) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (opts.short) {
    if (abs >= 1e9) return `${sign}฿${(abs / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `${sign}฿${(abs / 1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${sign}฿${(abs / 1e3).toFixed(0)}K`
    return `${sign}฿${abs.toFixed(0)}`
  }
  return `${sign}฿${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function fmtUSD(thb, rate = 35, short = false) {
  if (thb == null || isNaN(thb)) return '—'
  const usd = thb / rate
  const abs = Math.abs(usd)
  const sign = usd < 0 ? '-' : ''
  if (short || abs >= 1e4) {
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`
  }
  return `${sign}$${abs.toFixed(0)}`
}

export function fmtPct(value, decimals = 2, showSign = true) {
  if (value == null || isNaN(value)) return '—'
  const pct = value * 100
  const sign = showSign && pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(decimals)}%`
}

export function fmtMultiple(value) {
  if (value == null || isNaN(value)) return '—'
  return `${value.toFixed(2)}x`
}

export function pctColor(value) {
  if (value == null || isNaN(value)) return 'text-slate-400'
  return value >= 0 ? 'text-emerald-400' : 'text-red-400'
}

export function pctBg(value) {
  if (value == null || isNaN(value)) return ''
  return value >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
}

// ─── Date Helpers ──────────────────────────────────────────────────────────

export function getLastFriday(from = new Date()) {
  const d = new Date(from)
  const day = d.getDay() // 0=Sun … 6=Sat
  const daysBack = day >= 5 ? day - 5 : day + 2
  d.setDate(d.getDate() - daysBack)
  return d
}

export function getNextFriday(from = new Date()) {
  const d = new Date(from)
  const day = d.getDay()
  if (day === 5) return d
  const daysAhead = day < 5 ? 5 - day : 5 + 7 - day
  d.setDate(d.getDate() + daysAhead)
  return d
}

export function toISODate(date) {
  return date.toISOString().split('T')[0]
}

export function parseDate(str) {
  // Parse YYYY-MM-DD as local date (avoid timezone shift)
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function ageFromBirth(birthDate) {
  const birth = typeof birthDate === 'string' ? parseDate(birthDate) : birthDate
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export function planYearFromStart(planStartDate) {
  const start = typeof planStartDate === 'string' ? parseDate(planStartDate) : planStartDate
  const msPerYear = 365.25 * 24 * 3600 * 1000
  return Math.max(0, (new Date() - start) / msPerYear)
}
