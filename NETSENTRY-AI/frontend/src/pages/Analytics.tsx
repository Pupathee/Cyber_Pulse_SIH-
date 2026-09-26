import { useEffect, useState } from 'react'
import { Activity, BarChart3, Database, ShieldAlert, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchAnalytics, type AnalyticsResult } from '../services/api'

const COLORS = ['#00f5d4', '#008cff', '#ff9100', '#ef4444', '#a855f7', '#10b981']

export default function Analytics() {
  const [data, setData] = useState<AnalyticsResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAnalytics().then(setData).catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load analytics'))
  }, [])

  const metricCards: [string, number, LucideIcon, string][] = data ? [
    ['Total Monitored Traffic', data.total_monitored_traffic, Database, 'text-cyber-cyan'],
    ['Total Alerts', data.total_alerts, ShieldAlert, 'text-cyber-red'],
    ['High-Risk Events', data.high_risk_events, TrendingUp, 'text-cyber-orange'],
    ['Attack Types', data.attack_distribution.length, Activity, 'text-cyber-blue'],
  ] : []

  return (
    <div className="min-h-screen cyber-grid scanlines pt-20 pb-16">
      <div className="max-w-screen-2xl mx-auto px-6 space-y-6">
        <header className="pt-6">
          <div className="text-xs text-cyber-muted tracking-widest uppercase mb-1">Network Intelligence</div>
          <h1 className="text-3xl font-black tracking-wider text-cyber-cyan glow-cyan">ANALYTICS</h1>
          <p className="text-sm text-cyber-muted mt-1">Separate operational monitoring from longer-range threat analysis.</p>
        </header>

        {error && <div className="glass-card p-4 border-cyber-red/30 text-cyber-red text-sm">{error}</div>}
        {data && <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricCards.map(([label, value, Icon, color]) => <div key={label} className="glass-card p-5"><div className="flex items-center justify-between"><span className="text-[10px] text-cyber-muted tracking-widest uppercase">{label}</span><Icon className={`w-4 h-4 ${color}`} /></div><div className={`text-3xl font-black mt-3 ${color}`}>{value}</div><div className="text-xs text-cyber-muted mt-1">From current live telemetry</div></div>)}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="glass-card p-5"><div className="flex items-center gap-2 text-sm font-bold text-cyber-cyan mb-4"><BarChart3 className="w-4 h-4" />Attack Distribution</div><ResponsiveContainer width="100%" height={280}><BarChart data={data.attack_distribution} layout="vertical" margin={{ left: 20, right: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.07)" /><XAxis type="number" tick={{ fill: '#7d99aa', fontSize: 10 }} /><YAxis type="category" dataKey="attack" width={110} tick={{ fill: '#e8f7ff', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#07111c', border: '1px solid rgba(0,245,212,.25)' }} /><Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]}>{data.attack_distribution.map((entry, index) => <Cell key={entry.attack} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
            <div className="glass-card p-5"><div className="flex items-center gap-2 text-sm font-bold text-cyber-red mb-4"><TrendingUp className="w-4 h-4" />Risk Trend</div><ResponsiveContainer width="100%" height={280}><LineChart data={data.risk_trend} margin={{ left: 0, right: 12 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(239,68,68,0.08)" /><XAxis dataKey="index" tick={{ fill: '#7d99aa', fontSize: 10 }} /><YAxis domain={[0, 100]} tick={{ fill: '#7d99aa', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#07111c', border: '1px solid rgba(239,68,68,.25)' }} /><Line type="monotone" dataKey="risk_score" name="Risk Score" stroke="#ef4444" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
            <div className="glass-card p-5 xl:col-span-2"><div className="flex items-center gap-2 text-sm font-bold text-purple-400 mb-4"><Activity className="w-4 h-4" />Future Attack Probability</div><ResponsiveContainer width="100%" height={240}><LineChart data={data.future_probability} margin={{ left: 0, right: 12 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.08)" /><XAxis dataKey="index" tick={{ fill: '#7d99aa', fontSize: 10 }} /><YAxis domain={[0, 100]} tick={{ fill: '#7d99aa', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#07111c', border: '1px solid rgba(168,85,247,.25)' }} formatter={(value: number) => [`${value.toFixed(1)}%`, 'Future Probability']} /><Line type="monotone" dataKey="probability" stroke="#a855f7" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          </div>
        </>}
      </div>
    </div>
  )
}
