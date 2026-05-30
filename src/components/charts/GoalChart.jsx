import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import { fmtTHB } from '../../lib/utils'
import { PLAN_MILESTONES } from '../../lib/goalCurve'

const yFmt = (v) => {
  if (v >= 1e9) return `฿${(v / 1e9).toFixed(0)}B`
  if (v >= 1e6) return `฿${(v / 1e6).toFixed(0)}M`
  if (v >= 1e3) return `฿${(v / 1e3).toFixed(0)}K`
  return `฿${v}`
}

export default function GoalChart({ goalCurve, actualHistory, height = 220 }) {
  if (!goalCurve?.length) return null

  // Merge goal curve and actual data by year-in-plan
  const maxActualYear = actualHistory?.length
    ? actualHistory[actualHistory.length - 1]?.yearInPlan ?? 0
    : 0

  // Show full 40-year goal with actual overlaid
  const data = goalCurve.map(g => {
    const match = actualHistory?.find(a => Math.abs((a.yearInPlan ?? 0) - g.yearInPlan) < 0.04)
    return {
      year: +g.yearInPlan.toFixed(1),
      goal: g.goal,
      actual: match?.balance ?? (g.yearInPlan <= maxActualYear + 0.1 ? undefined : undefined),
    }
  })

  // Inject actual points at exact positions
  if (actualHistory?.length) {
    actualHistory.forEach(a => {
      const yr = a.yearInPlan ?? 0
      const idx = data.findIndex(d => Math.abs(d.year - yr) < 0.04)
      if (idx >= 0) data[idx].actual = a.balance
    })
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradGoal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="year" type="number" domain={[0, 40]}
          tickFormatter={v => `Yr ${v}`} tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false} axisLine={false} ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40]}
        />
        <YAxis scale="log" domain={['auto', 'auto']} tickFormatter={yFmt}
          tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} width={56}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, fontSize: 12 }}
          labelFormatter={v => `Year ${v}`}
          formatter={(v, name) => [fmtTHB(v, { short: true }), name === 'goal' ? 'Target' : 'Actual']}
        />
        {PLAN_MILESTONES.map(m => (
          <ReferenceLine key={m.year} x={m.year} stroke="#374151" strokeDasharray="3 3"
            label={{ value: `Yr${m.year}`, fill: '#4b5563', fontSize: 9, position: 'top' }}
          />
        ))}
        <Area type="monotone" dataKey="goal" stroke="#f59e0b" strokeWidth={1.5}
          strokeDasharray="5 3" fill="url(#gradGoal)" dot={false} name="goal" />
        <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2}
          fill="url(#gradActual)" dot={false} connectNulls={false} name="actual" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
