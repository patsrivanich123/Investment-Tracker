import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { format } from 'date-fns'
import { fmtTHB } from '../../lib/utils'

const fmt = (v) => {
  if (v >= 1e9) return `฿${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `฿${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `฿${(v / 1e3).toFixed(0)}K`
  return `฿${v.toFixed(0)}`
}

export default function PortfolioChart({ data, accounts, combined = true }) {
  if (!data?.length) return <Empty />

  const COLORS = { combined: '#3b82f6', ...Object.fromEntries(accounts.map(a => [a.id, a.color])) }

  const chartData = data.map(d => ({
    ...d,
    dateLabel: (() => { try { return format(new Date(d.date), 'MMM d') } catch { return d.date } })(),
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradPort" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="dateLabel" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={fmt} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v) => [fmtTHB(v, { short: true }), 'Balance']}
        />
        <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2}
          fill="url(#gradPort)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function Empty() {
  return (
    <div className="h-44 flex items-center justify-center text-slate-600 text-sm">
      No data yet — log your first week
    </div>
  )
}
