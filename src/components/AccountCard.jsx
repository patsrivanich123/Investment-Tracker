import { fmtTHB, fmtPct, pctColor, fmtUSD } from '../lib/utils'

export default function AccountCard({ account, metrics, usdRate = 35, onClick }) {
  const balance = metrics?.currentBalance ?? null
  const weekRet = metrics?.lastWeekReturn ?? null
  const annRet = metrics?.annReturn ?? null

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-app-card border border-app-border rounded-2xl p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: account.color }} />
          <span className="font-semibold text-slate-100">{account.display_name}</span>
          {!account.is_active && (
            <span className="text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">pending</span>
          )}
        </div>
        {weekRet !== null && (
          <span className={`text-sm font-mono font-semibold ${pctColor(weekRet)}`}>
            {fmtPct(weekRet)} wk
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold font-mono text-slate-100">
            {balance !== null ? fmtTHB(balance, { short: true }) : '—'}
          </p>
          {balance !== null && (
            <p className="text-xs text-slate-500 mt-0.5">{fmtUSD(balance, usdRate)}</p>
          )}
        </div>
        {annRet !== null && (
          <div className="text-right">
            <p className={`text-sm font-mono font-semibold ${pctColor(annRet)}`}>
              {fmtPct(annRet)} ann.
            </p>
            {metrics.sharpe !== null && (
              <p className="text-xs text-slate-500">Sharpe {metrics.sharpe.toFixed(2)}</p>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
