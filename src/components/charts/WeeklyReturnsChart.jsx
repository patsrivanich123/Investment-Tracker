import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ReferenceLine,
} from 'recharts'
import { fmtPct } from '../../lib/utils'

export default function WeeklyReturnsChart({ balanceHistory, height = 160 }) {
  if (!balanceHistory?.length) return null

  // Derive weekly returns from balance history (already attached from metrics)
  const data = balanceHistory.slice(1).map((d, i) => {
    const prev = balanceHistory[i]
    // Use drawdown proxy — or just compute rough return for chart
    const ret = prev.balance > 0 ? (d.balance - prev.balance) / prev.balance : 0
    return {
      date: d.date?.slice(5) ?? '', // MM-DD
      ret,
    }
  })

  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={false}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
        />
        <YAxis tickFormatter={v => fmtPct(v, 1)} tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false} axisLine={false} width={44} />
        <ReferenceLine y={0} stroke="#374151" />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v) => [fmtPct(v), 'Return']}
        />
        <Bar dataKey="ret" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.ret >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
