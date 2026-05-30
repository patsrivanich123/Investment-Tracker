import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { fmtPct } from '../../lib/utils'

export default function DrawdownChart({ balanceHistory, height = 140 }) {
  if (!balanceHistory?.length) return null

  const data = balanceHistory.map(d => ({
    date: d.date?.slice(5) ?? '',
    dd: -(d.drawdown ?? 0),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradDD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={false}
          interval={Math.max(0, Math.floor(data.length / 6) - 1)}
        />
        <YAxis tickFormatter={v => fmtPct(v, 0)} tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false} axisLine={false} width={40} domain={['auto', 0]}
        />
        <ReferenceLine y={0} stroke="#374151" />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v) => [fmtPct(v, 2), 'Drawdown']}
        />
        <Area type="monotone" dataKey="dd" stroke="#ef4444" strokeWidth={1.5}
          fill="url(#gradDD)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
