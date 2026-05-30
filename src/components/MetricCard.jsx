export default function MetricCard({ label, value, sub, highlight, small }) {
  return (
    <div className="bg-app-card border border-app-border rounded-2xl p-4 flex flex-col gap-1">
      <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</span>
      <span className={`font-bold font-mono leading-none ${small ? 'text-xl' : 'text-2xl'} ${highlight || 'text-slate-100'}`}>
        {value ?? '—'}
      </span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  )
}
