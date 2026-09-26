import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell,
} from 'recharts'
import {
  Database, AlertTriangle, Brain, Shield, Zap, ChevronRight,
  FileText, Activity, Search, Info,
} from 'lucide-react'

import MetricCard    from '../components/MetricCard'
import RiskBadge     from '../components/RiskBadge'
import SectionHeader from '../components/SectionHeader'
import FileUpload    from '../components/FileUpload'
import { analyzeDataset, type DatasetAnalysisResult } from '../services/api'

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

const riskBg: Record<RiskLevel, string> = {
  LOW:      'border-cyber-green/30 bg-cyber-green/5',
  MEDIUM:   'border-yellow-400/30  bg-yellow-400/5',
  HIGH:     'border-cyber-orange/30 bg-cyber-orange/5',
  CRITICAL: 'border-cyber-red/30   bg-cyber-red/5',
}

const riskIcon: Record<RiskLevel, string> = {
  LOW: '🟢', MEDIUM: '🟡', HIGH: '🟠', CRITICAL: '🔴',
}

const BAR_COLORS = ['#00f5d4', '#008cff', '#00ff9d', '#ff9100', '#ff2d41', '#a855f7', '#facc15']

export default function DatasetDetection() {
  const [file,     setFile]     = useState<File | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<DatasetAnalysisResult | null>(null)
  const [error,    setError]    = useState('')

  const onAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await analyzeDataset(file)
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const rl = (result?.risk_level ?? 'LOW') as RiskLevel

  return (
    <div className="min-h-screen cyber-grid scanlines pt-20 pb-16">
      <div className="max-w-screen-2xl mx-auto px-6 space-y-8">

        {/* ── Page Header ─────────────────────────────────── */}
        <div className="pt-6">
          <div className="text-xs text-cyber-muted tracking-widest uppercase mb-1">AI Pipeline</div>
          <h1 className="text-3xl font-black tracking-wider text-cyber-cyan glow-cyan">
            DATASET DETECTION
          </h1>
          <p className="text-sm text-cyber-muted mt-1">
            Upload a CIC-IDS2017 CSV to run the full AI detection, forecasting and risk pipeline.
          </p>
        </div>

        {/* ── Upload Section ───────────────────────────────── */}
        <div className="glass-card p-6 space-y-4">
          <SectionHeader
            title="Upload Dataset"
            description="CIC-IDS2017 network traffic CSV"
            icon={<Database className="w-4 h-4" />}
          />
          <FileUpload
            onFile={setFile}
            label="Drop CIC-IDS2017 CSV here"
            hint="Random Forest + LSTM pipeline will run on the uploaded file."
            disabled={loading}
          />
          {file && (
            <button
              onClick={onAnalyze}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyber-cyan text-cyber-bg font-bold tracking-widest hover:bg-cyber-cyan/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-cyan"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-cyber-bg/30 border-t-cyber-bg rounded-full animate-spin" />
                  ANALYZING…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  RUN ANALYSIS
                </>
              )}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card p-5 border-cyber-red/30 bg-cyber-red/5">
            <div className="text-cyber-red font-bold text-sm">{error}</div>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────── */}
        {result && (
          <>
            {result.unknown_pattern?.is_unknown && (
              <div className="glass-card p-5 border-yellow-400/50 bg-yellow-400/10">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
                  <div>
                    <div className="text-sm font-black tracking-widest text-yellow-400">POTENTIAL UNKNOWN THREAT</div>
                    <p className="text-sm text-cyber-text mt-1">This traffic does not confidently match a trained attack class. {result.unknown_pattern.reason}</p>
                    <div className="text-xs text-yellow-400 mt-2">Anomaly score: {result.unknown_pattern.anomaly_score.toFixed(1)}/100</div>
                  </div>
                </div>
              </div>
            )}

            {/* Dataset info strip */}
            <div className="glass-card p-5">
              <SectionHeader title="Dataset Summary" icon={<FileText className="w-4 h-4" />} />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-black text-cyber-cyan">{result.dataset_name}</div>
                  <div className="text-xs text-cyber-muted mt-1 uppercase tracking-widest">Dataset</div>
                </div>
                <div>
                  <div className="text-xl font-black text-cyber-green">{result.num_records.toLocaleString()}</div>
                  <div className="text-xs text-cyber-muted mt-1 uppercase tracking-widest">Records</div>
                </div>
                <div>
                  <div className="text-xl font-black text-cyber-blue">{result.num_features}</div>
                  <div className="text-xs text-cyber-muted mt-1 uppercase tracking-widest">Features</div>
                </div>
              </div>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Attack Type"
                value={result.attack_type}
                description="Identifies the current network activity and classifies the most likely attack type."
                icon={<AlertTriangle className="w-4 h-4" />}
                accent="red"
              />
              <MetricCard
                title="Detection Confidence"
                value={`${result.detection_confidence.toFixed(1)}%`}
                description="Average confidence of the Random Forest classifier across all records."
                icon={<Shield className="w-4 h-4" />}
                accent="cyan"
              />
              <MetricCard
                title="Future Attack Probability"
                value={`${result.future_probability.toFixed(1)}%`}
                description="Uses recent traffic sequences to estimate future attack probability."
                icon={<Brain className="w-4 h-4" />}
                accent="blue"
              />
              <MetricCard
                title="Risk Score"
                value={`${result.risk_score}/100`}
                description="Combines detection confidence, future risk and attack severity into a 0–100 priority score."
                icon={<Zap className="w-4 h-4" />}
                accent={rl === 'CRITICAL' ? 'red' : rl === 'HIGH' ? 'orange' : rl === 'MEDIUM' ? 'orange' : 'green'}
              />
            </div>

            {/* Risk Level Banner + Recommended Action */}
            <div className={`glass-card p-6 border ${riskBg[rl]}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-4xl">{riskIcon[rl]}</div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-black tracking-widest text-cyber-text">{rl} RISK</span>
                      <RiskBadge level={rl} size="md" />
                    </div>
                    <div className="text-sm text-cyber-muted">Risk Score: {result.risk_score}/100</div>
                  </div>
                </div>
                <div className="flex-1 border-l border-white/10 pl-4">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-cyber-cyan mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-cyber-muted uppercase tracking-widest mb-1">Recommended Action</div>
                      <p className="text-sm text-cyber-text font-semibold leading-relaxed">{result.recommended_action}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* XAI + Attack Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* XAI */}
              <div className="glass-card p-5">
                <SectionHeader
                  title="AI Explanation (XAI)"
                  description="Shows the network features that are most influential to the trained model."
                  icon={<Brain className="w-4 h-4" />}
                />
                <div className="space-y-2 mb-4">
                  {result.feature_importance.slice(0, 8).map((fi, i) => (
                    <div key={fi.feature} className="flex items-center gap-3">
                      <span className="text-xs text-cyber-muted font-mono w-4 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-cyber-text truncate mr-2">{fi.feature}</span>
                          <span className="text-xs font-mono text-cyber-cyan shrink-0">{fi.importance.toFixed(4)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-blue"
                            style={{ width: `${(fi.importance / result.feature_importance[0].importance) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-cyber-muted border-t border-white/5 pt-3 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cyber-cyan" />
                  Feature importances from the trained Random Forest model. Higher values indicate stronger influence on classification.
                </div>
              </div>

              {/* Attack Distribution */}
              <div className="glass-card p-5">
                <SectionHeader
                  title="Attack Distribution"
                  description="Breakdown of detected attack types across all records."
                  icon={<Activity className="w-4 h-4" />}
                />
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={result.attack_distribution}
                    margin={{ top: 5, right: 10, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.06)" />
                    <XAxis
                      dataKey="attack"
                      tick={{ fill: '#7d99aa', fontSize: 10 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fill: '#7d99aa', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(7,17,28,0.96)', border: '1px solid rgba(0,245,212,0.25)', borderRadius: 10, color: '#e8f7ff' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {result.attack_distribution.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Timeline + Future Probability */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Risk Graph */}
              <div className="glass-card p-5">
                <SectionHeader
                  title="Risk Graph"
                  description="Risk score sampled across the dataset in 50-record chunks."
                  icon={<Zap className="w-4 h-4" />}
                />
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={result.risk_data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ff9100" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ff9100" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.06)" />
                    <XAxis dataKey="index" tick={{ fill: '#7d99aa', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#7d99aa', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(7,17,28,0.96)', border: '1px solid rgba(0,245,212,0.25)', borderRadius: 10, color: '#e8f7ff' }}
                      formatter={(v: number) => [`${v}`, 'Risk Score']}
                    />
                    <Area type="monotone" dataKey="risk_score" stroke="#ff9100" strokeWidth={2} fill="url(#riskGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Future Attack Probability */}
              <div className="glass-card p-5">
                <SectionHeader
                  title="Future Attack Probability"
                  description="LSTM forecast output across the dataset."
                  icon={<Brain className="w-4 h-4" />}
                />
                <div className="flex flex-col items-center justify-center h-[220px] gap-4">
                  <div className="relative w-36 h-36">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,140,255,0.1)" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke="#008cff"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - result.future_probability / 100)}`}
                        style={{ filter: 'drop-shadow(0 0 6px #008cff)' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-cyber-blue">{result.future_probability.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-cyber-text font-semibold">LSTM Forecast Probability</div>
                    <div className="text-xs text-cyber-muted mt-1">Based on last 20-record sequence</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detection Result Table */}
            <div className="glass-card p-5">
              <SectionHeader
                title="Detection Results Summary"
                description="Full analysis results from the AI pipeline."
                icon={<FileText className="w-4 h-4" />}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-cyber-muted uppercase tracking-widest text-xs">
                      <th className="text-left py-2 px-4 font-semibold">Field</th>
                      <th className="text-left py-2 px-4 font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { field: 'Dataset',                  value: result.dataset_name },
                      { field: 'Records',                  value: result.num_records.toLocaleString() },
                      { field: 'Features',                 value: result.num_features },
                      { field: 'Attack Type',              value: result.attack_type },
                      { field: 'Detection Confidence',     value: `${result.detection_confidence.toFixed(2)}%` },
                      { field: 'Future Attack Probability',value: `${result.future_probability.toFixed(2)}%` },
                      { field: 'Risk Score',               value: `${result.risk_score}/100` },
                      { field: 'Risk Level',               value: <RiskBadge level={rl} size="sm" /> },
                      { field: 'Recommended Action',       value: result.recommended_action },
                    ].map(({ field, value }) => (
                      <tr key={field} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                        <td className="py-3 px-4 text-cyber-muted font-semibold uppercase tracking-widest text-xs">{field}</td>
                        <td className="py-3 px-4 text-cyber-text font-mono text-xs">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
