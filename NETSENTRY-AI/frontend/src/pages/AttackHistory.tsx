import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Download, Eye, History, RefreshCw, Trash2, X } from 'lucide-react'
import { clearAlerts, fetchAlerts, type Alert } from '../services/api'

type RiskFilter = 'ALL' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export default function AttackHistory() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [date, setDate] = useState('')
  const [attack, setAttack] = useState('ALL')
  const [risk, setRisk] = useState<RiskFilter>('ALL')
  const [selected, setSelected] = useState<Alert | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setAlerts((await fetchAlerts()).alerts)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load attack history')
    }
  }

  useEffect(() => { void load() }, [])

  const attackTypes = useMemo(() => ['ALL', ...Array.from(new Set(alerts.map((item) => item.attack_type))).sort()], [alerts])
  const filtered = alerts.filter((item) => {
    const matchesDate = !date || item.timestamp.startsWith(date)
    const matchesAttack = attack === 'ALL' || item.attack_type === attack
    const matchesRisk = risk === 'ALL' || item.risk_level === risk
    return matchesDate && matchesAttack && matchesRisk
  })

  const counts = {
    total: alerts.length,
    critical: alerts.filter((item) => item.risk_level === 'CRITICAL').length,
    high: alerts.filter((item) => item.risk_level === 'HIGH').length,
    medium: alerts.filter((item) => item.risk_level === 'MEDIUM').length,
  }

  const exportCsv = () => {
    const header = ['Timestamp', 'Attack', 'Risk', 'Level', 'Confidence', 'Future Risk', 'Action']
    const rows = filtered.map((item) => [item.timestamp, item.attack_type, item.risk_score, item.risk_level, item.confidence, item.future_probability, item.recommended_action])
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'netsentry-attack-history.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearHistory = async () => {
    await clearAlerts()
    setAlerts([])
    setSelected(null)
  }

  return (
    <div className="min-h-screen cyber-grid scanlines pt-20 pb-16">
      <div className="max-w-screen-2xl mx-auto px-6 space-y-6">
        <header className="pt-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-cyber-muted tracking-widest uppercase mb-1">Security Operations</div>
            <h1 className="text-3xl font-black tracking-wider text-cyber-cyan glow-cyan">ATTACK HISTORY</h1>
            <p className="text-sm text-cyber-muted mt-1">Review and export the monitored threat event timeline.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-cyber-muted hover:text-cyber-cyan"><RefreshCw className="w-4 h-4" />Refresh</button>
            <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyber-cyan/30 text-cyber-cyan"><Download className="w-4 h-4" />Export CSV</button>
            <button onClick={() => void clearHistory()} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyber-red/30 text-cyber-red"><Trash2 className="w-4 h-4" />Clear History</button>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[['Total Alerts', counts.total, 'text-cyber-cyan'], ['Critical', counts.critical, 'text-cyber-red'], ['High', counts.high, 'text-cyber-orange'], ['Medium', counts.medium, 'text-yellow-400']].map(([label, value, color]) => (
            <div key={String(label)} className="glass-card p-5"><div className="text-[11px] text-cyber-muted uppercase tracking-widest">{label}</div><div className={`text-3xl font-black mt-2 ${color}`}>{value}</div></div>
          ))}
        </div>

        <div className="glass-card p-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-cyber-muted uppercase tracking-widest">Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="block mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-cyber-text" /></label>
          <label className="text-xs text-cyber-muted uppercase tracking-widest">Attack Type<select value={attack} onChange={(event) => setAttack(event.target.value)} className="block mt-1 bg-[#0a1628] border border-white/10 rounded-lg px-3 py-2 text-sm text-cyber-text">{attackTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs text-cyber-muted uppercase tracking-widest">Risk Level<select value={risk} onChange={(event) => setRisk(event.target.value as RiskFilter)} className="block mt-1 bg-[#0a1628] border border-white/10 rounded-lg px-3 py-2 text-sm text-cyber-text">{['ALL', 'MEDIUM', 'HIGH', 'CRITICAL'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <span className="ml-auto text-xs text-cyber-muted">Showing {filtered.length} of {alerts.length} events</span>
        </div>

        {error && <div className="glass-card p-4 border-cyber-red/30 text-cyber-red text-sm">{error}</div>}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#0a1628] border-b border-cyber-cyan/10"><tr>{['Time', 'Attack', 'Risk', 'Level', 'Future Risk', 'Action'].map((label) => <th key={label} className="text-left py-3 px-4 text-[10px] text-cyber-muted tracking-widest uppercase">{label}</th>)}</tr></thead>
              <tbody>{filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-16 text-cyber-muted"><History className="w-8 h-8 mx-auto mb-2 opacity-40" />No alert history matches these filters.</td></tr> : filtered.slice().reverse().map((item, index) => <tr key={`${item.timestamp}-${index}`} className="border-b border-white/5 hover:bg-white/5"><td className="py-3 px-4 font-mono text-cyber-muted">{item.timestamp}</td><td className="py-3 px-4 font-bold text-cyber-text">{item.attack_type}{item.unknown_pattern && <span className="ml-2 text-yellow-400">Unknown</span>}</td><td className="py-3 px-4 font-bold text-cyber-text">{item.risk_score.toFixed(1)}</td><td className="py-3 px-4"><span className={`px-2 py-1 rounded border font-bold ${item.risk_level === 'CRITICAL' ? 'text-cyber-red border-cyber-red/30' : item.risk_level === 'HIGH' ? 'text-cyber-orange border-cyber-orange/30' : 'text-yellow-400 border-yellow-400/30'}`}>{item.risk_level}</span></td><td className="py-3 px-4 text-cyber-muted">{item.future_probability.toFixed(1)}%</td><td className="py-3 px-4"><button onClick={() => setSelected(item)} className="flex items-center gap-1 text-cyber-cyan hover:text-white"><Eye className="w-3.5 h-3.5" />View Details</button></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setSelected(null)}><div className="glass-card max-w-lg w-full p-6" onClick={(event) => event.stopPropagation()}><div className="flex justify-between items-center mb-5"><h2 className="font-bold text-cyber-cyan">Alert Details</h2><button onClick={() => setSelected(null)}><X className="w-5 h-5 text-cyber-muted" /></button></div><div className="space-y-3 text-sm">{[['Timestamp', selected.timestamp], ['Attack', selected.attack_type], ['Risk Level', selected.risk_level], ['Risk Score', `${selected.risk_score}/100`], ['Detection Confidence', `${selected.confidence}%`], ['Future Risk', `${selected.future_probability}%`], ['Recommended Action', selected.recommended_action]].map(([label, value]) => <div key={String(label)} className="flex gap-3 border-b border-white/5 pb-2"><span className="w-40 text-cyber-muted">{label}</span><span className="text-cyber-text font-semibold">{value}</span></div>)}</div></div></div>}
    </div>
  )
}
