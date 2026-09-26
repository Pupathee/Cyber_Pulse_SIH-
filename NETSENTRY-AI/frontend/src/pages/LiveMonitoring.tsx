import { useState, useCallback, useRef, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  Activity, AlertTriangle, Brain, Zap, Play, Eye, X,
  Gauge, TrendingUp,
  Sparkles,
} from 'lucide-react'
import {
  subscribeToLiveEvents, clearAlerts,
  fetchModelStatus, generateLiveOverview, type LiveEvent, type ModelStatus,
} from '../services/api'

// ── Types ──────────────────────────────────────────────────
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type SimStatus = 'idle' | 'running' | 'done' | 'error'
type Preset = 'ddos' | 'portscan' | 'web' | 'infiltration' | 'benign'

interface FlowRow {
  id: string
  timestamp: string
  src: string
  dst: string
  dstPort: number
  proto: string
  rfStatus: string
  attack: string
  confidence: number
  riskScore: number
}

interface ChartPoint {
  label: string
  risk: number
  traffic: number
}

interface LstmPoint {
  label: string
  value: number
}

// ── Helpers ────────────────────────────────────────────────
const ATTACK_COLORS: Record<string, string> = {
  BENIGN: '#10b981', DDOS: '#ef4444', BOT: '#ef4444',
  PORTSCAN: '#f59e0b', 'FTP-PATATOR': '#f59e0b', 'SSH-PATATOR': '#f59e0b',
  'WEB ATTACK': '#8b5cf6', 'WEB ATTACK \uFFFD BRUTE FORCE': '#8b5cf6',
  'WEB ATTACK \uFFFD XSS': '#8b5cf6',
  'DOS HULK': '#ff9100', 'DOS GOLDENEYE': '#ff9100',
  'DOS SLOWLORIS': '#ff9100', 'DOS SLOWHTTPTEST': '#ff9100',
}

const PROTOS = ['TLSv1.3', 'HTTP/2', 'TCP', 'UDP', 'ICMP', 'TLSv1.2']
const SRC_POOL = [
  '185.220.101.184', '198.51.100.4', '45.33.32.53', '91.240.118.66',
  '203.0.113.186', '185.220.101.231', '172.16.8.198', '185.220.101.248',
  '91.240.118.127', '185.220.101.194', '91.240.118.228', '198.51.100.19',
  '203.0.113.215', '45.33.32.244', '192.168.1.169', '192.168.1.73',
]
const DST_POOL = [
  '192.168.1.14', '172.16.0.8', '10.0.4.41', '192.168.1.22',
  '10.0.4.39', '10.0.4.18', '10.0.4.40', '172.16.0.13',
  '192.168.1.43', '192.168.1.34', '172.16.0.17', '10.0.4.4',
]

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const fmtTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function makeFlowRow(event: LiveEvent, index: number): FlowRow {
  const attack = event.attack_type.toUpperCase()
  const isMalicious = attack !== 'BENIGN'
  return {
    id:         `FL-${rnd(10000, 99999)}`,
    timestamp:  `2026-09-15 ${fmtTime()}`,
    src:        pick(SRC_POOL),
    dst:        pick(DST_POOL),
    dstPort:    pick([443, 80, 8080, 8678, 55188, 49488, 22, 53, 389, 54863]),
    proto:      pick(PROTOS),
    rfStatus:   isMalicious ? `ATTACK DETECTED` : 'BENIGN CLEAN',
    attack:     event.attack_type,
    confidence: event.detection_confidence,
    riskScore:  event.risk_score,
  }
}

const attackKey = (a: string) => a.toUpperCase().replace(/\s+/g, ' ')
const colorForAttack = (a: string) => {
  const k = attackKey(a)
  for (const [key, col] of Object.entries(ATTACK_COLORS)) {
    if (k.includes(key)) return col
  }
  return '#7d99aa'
}

const riskLevelColor: Record<RiskLevel, string> = {
  LOW: '#10b981', MEDIUM: '#facc15', HIGH: '#ff9100', CRITICAL: '#ef4444',
}
const riskLevelLabel: Record<RiskLevel, string> = {
  LOW: 'SAFE OPERATIONAL', MEDIUM: 'ELEVATED RISK', HIGH: 'HIGH ALERT', CRITICAL: 'CRITICAL THREAT',
}

const PRESET_LABELS: Record<Preset, string> = {
  ddos: 'DDoS Storm', portscan: 'PortScan Recon',
  web: 'Web Attack', infiltration: 'Infiltration', benign: 'Normal Benign',
}

// ── Simulated "traffic rate" for visual appeal ─────────────
function trafficMbps(riskScore: number): number {
  // Higher risk = more traffic in a DDoS-like scenario, with noise
  const base = riskScore > 70 ? 900 + rnd(0, 400) : 200 + rnd(0, 400)
  return Math.round(base)
}

// ── Attack distribution aggregator ─────────────────────────
function buildDistribution(flows: FlowRow[]) {
  const counts: Record<string, number> = {}
  flows.forEach((f) => {
    const k = f.attack.toUpperCase()
    counts[k] = (counts[k] ?? 0) + 1
  })
  return Object.entries(counts).map(([attack, count]) => ({ attack, count }))
}

// ── LSTM sparkline seed data ────────────────────────────────
const INITIAL_LSTM: LstmPoint[] = Array.from({ length: 12 }, (_, i) => ({
  label: `t-${11 - i}`,
  value: 5 + Math.random() * 25,
}))

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function LiveMonitoring() {
  // ── State ────────────────────────────────────────────────
  const [simStatus,   setSimStatus]  = useState<SimStatus>('idle')
  const [preset,      setPreset]     = useState<Preset>('ddos')
  const [current,     setCurrent]    = useState<LiveEvent | null>(null)
  const [flows,       setFlows]      = useState<FlowRow[]>([])
  const [chart,       setChart]      = useState<ChartPoint[]>([])
  const [lstmChart,   setLstmChart]  = useState<LstmPoint[]>(INITIAL_LSTM)
  const [filter,      setFilter]     = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'BENIGN'>('ALL')
  const [search,      setSearch]     = useState('')
  const [inspect,     setInspect]    = useState<FlowRow | null>(null)
  const [errorMsg,    setErrorMsg]   = useState('')
  const [modelInfo,   setModelInfo]  = useState<ModelStatus | null>(null)
  const [autoStream,  setAutoStream] = useState(true)
  const [clock,       setClock]      = useState(fmtTime())
  const [liveOverview, setLiveOverview] = useState('')
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState('')
  const [activeAlert, setActiveAlert] = useState<LiveEvent['alert']>(null)
  const esRef    = useRef<EventSource | null>(null)
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Clock ticker ────────────────────────────────────────
  useEffect(() => {
    clockRef.current = setInterval(() => setClock(fmtTime()), 1000)
    return () => { if (clockRef.current) clearInterval(clockRef.current) }
  }, [])

  // ── Load model info on mount ─────────────────────────────
  useEffect(() => {
    fetchModelStatus().then(setModelInfo).catch(() => null)
  }, [])

  // ── Start simulation ─────────────────────────────────────
  const onStart = useCallback(async () => {
    setSimStatus('running')
    setFlows([])
    setChart([])
    setCurrent(null)
    setActiveAlert(null)
    setErrorMsg('')
    setLstmChart(INITIAL_LSTM)

    let chartBuffer: ChartPoint[] = []
    let lstmBuffer:  LstmPoint[]  = [...INITIAL_LSTM]

    esRef.current = subscribeToLiveEvents(
      (event) => {
        setCurrent(event)
        if (event.alert) setActiveAlert(event.alert)

        // ── Flow table row ──────────────────────────
        const row = makeFlowRow(event, event.record)
        setFlows((prev) => [row, ...prev].slice(0, 200))

        // ── Dual chart ──────────────────────────────
        const now = new Date()
        const label = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
        const pt: ChartPoint = {
          label,
          risk:    event.risk_score,
          traffic: trafficMbps(event.risk_score),
        }
        chartBuffer = [...chartBuffer, pt].slice(-20)
        setChart([...chartBuffer])

        // ── LSTM chart ──────────────────────────────
        const lp: LstmPoint = {
          label: `t${event.record}`,
          value: Math.round(event.future_probability),
        }
        lstmBuffer = [...lstmBuffer.slice(1), lp]
        setLstmChart([...lstmBuffer])
      },
      async () => {
        setSimStatus('done')
        await clearAlerts()
      },
      () => {
        setSimStatus('error')
        setErrorMsg('SSE connection error — check that the backend is running.')
      },
    )
  }, [])

  const onStop = () => {
    esRef.current?.close()
    setSimStatus('done')
  }

  const onGenerateOverview = async () => {
    if (overviewLoading) return
    setOverviewLoading(true)
    setOverviewError('')
    try {
      const response = await generateLiveOverview()
      setLiveOverview(response.reply)
    } catch (caught) {
      setOverviewError(caught instanceof Error ? caught.message : 'Could not generate live overview')
    } finally {
      setOverviewLoading(false)
    }
  }

  // ── Derived values ────────────────────────────────────────
  const rl        = (current?.risk_level ?? 'LOW') as RiskLevel
  const rlColor   = riskLevelColor[rl]
  const rlLabel   = riskLevelLabel[rl]
  const isRunning = simStatus === 'running'

  // Threat distribution for donut
  const distribution = buildDistribution(flows)

  // Table filter
  const filteredFlows = flows.filter((f) => {
    if (filter === 'BENIGN') return f.attack.toUpperCase() === 'BENIGN'
    if (filter === 'HIGH')     return f.riskScore >= 70 && f.riskScore < 90
    if (filter === 'CRITICAL') return f.riskScore >= 90
    if (search) {
      const s = search.toLowerCase()
      return (
        f.src.includes(s) || f.dst.includes(s) ||
        f.dstPort.toString().includes(s) ||
        f.attack.toLowerCase().includes(s)
      )
    }
    return true
  })

  // Mbps display
  const currentMbps = chart.length ? chart[chart.length - 1].traffic : 845.2

  return (
    <div className="min-h-screen bg-[#050b14] cyber-grid scanlines pt-16 font-sans">

      {/* ══════════════════════════════════════════════
          NAVBAR-LEVEL STATUS BAR
      ══════════════════════════════════════════════ */}
      <div className="sticky top-16 z-40 border-b border-cyber-cyan/10 bg-[#050b14]/95 backdrop-blur">
        <div className="max-w-screen-2xl mx-auto px-6 h-11 flex items-center gap-4 text-xs">

          {/* Auto-stream toggle */}
          <button
            onClick={() => setAutoStream((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold tracking-wider transition-colors ${
              autoStream
                ? 'border-cyber-cyan/40 bg-cyber-cyan/10 text-cyber-cyan'
                : 'border-white/10 text-cyber-muted'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoStream ? 'bg-cyber-cyan status-dot' : 'bg-cyber-muted'}`} />
            Live Auto-Stream: <strong>{autoStream ? `ACTIVE (2s)` : 'PAUSED'}</strong>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 text-cyber-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-green status-dot" />
            AI Engine: <strong className="text-white ml-1">ONLINE</strong>
          </div>

          {modelInfo && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 text-cyber-muted">
              <span className="text-cyber-cyan">CPU:</span>
              <strong className="text-cyber-cyan">{modelInfo.compute}</strong>
              <span className="ml-2">Classes:</span>
              <strong className="text-cyber-blue">{modelInfo.num_classes}</strong>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 text-cyber-muted font-mono">
            🕐 {clock}
          </div>
          <button
            onClick={onGenerateOverview}
            disabled={overviewLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyber-blue/40 bg-cyber-blue/10 text-cyber-blue font-bold disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            {overviewLoading ? 'ANALYZING' : 'AI OVERVIEW'}
          </button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 pb-16 space-y-5 pt-5">

        {/* ══════════════════════════════════════════════
            TOP METRIC CARDS
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Threat Level */}
          <div className="glass-card p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-widest text-cyber-muted uppercase">Threat Level</span>
              <AlertTriangle className="w-4 h-4" style={{ color: rlColor }} />
            </div>
            <div className="text-3xl font-black" style={{ color: rlColor, textShadow: `0 0 20px ${rlColor}66` }}>
              {rl}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{ color: rlColor, borderColor: `${rlColor}55`, background: `${rlColor}15` }}>
                {flows.filter(f => f.riskScore >= 70).length} Anomaly Bursts
              </span>
              <span className="text-[11px] text-cyber-muted">
                {rl === 'LOW' || rl === 'MEDIUM' ? 'Monitoring Active' : 'Action Required'}
              </span>
            </div>
          </div>

          {/* Flow Telemetry */}
          <div className="glass-card p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-widest text-cyber-muted uppercase">Flow Telemetry</span>
              <Activity className="w-4 h-4 text-cyber-cyan" />
            </div>
            <div className="text-3xl font-black text-white">
              {currentMbps.toLocaleString()} <span className="text-base text-cyber-muted font-normal">Mbps</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-cyber-cyan/40 bg-cyber-cyan/10 text-cyber-cyan">
                {(flows.length * 950 + rnd(0, 500)).toLocaleString()} Flows/sec
              </span>
              <span className="text-[11px] text-cyber-muted">CICIDS2017 Format</span>
            </div>
          </div>

          {/* Risk Index */}
          <div className="glass-card p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-widest text-cyber-muted uppercase">Current Risk Index</span>
              <Gauge className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {current ? current.risk_score.toFixed(1) : '0.0'}
              <span className="text-base text-cyber-muted font-normal"> /100</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{ color: rlColor, borderColor: `${rlColor}55`, background: `${rlColor}15` }}>
                {rlLabel}
              </span>
              <span className="text-[11px] text-cyber-muted">Random Forest Detector</span>
            </div>
          </div>

          {/* LSTM Forecast */}
          <div className="glass-card p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-widest text-cyber-muted uppercase">LSTM 10-Min Projection</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {current ? `${current.future_probability.toFixed(1)}%` : '0.0%'}
              <span className="text-base text-cyber-muted font-normal"> Peak</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-500/40 bg-purple-500/10 text-purple-400">
                PyTorch LSTM Engine
              </span>
              <span className="text-[11px] text-cyber-muted">Time-Series Forecaster</span>
            </div>
          </div>
        </div>

        {current?.explanation && (
          <div className="glass-card p-5 border-cyber-blue/25 bg-cyber-blue/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyber-blue/10 border border-cyber-blue/20">
                <Sparkles className="w-4 h-4 text-cyber-blue" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm font-bold tracking-wider text-cyber-blue">PER-EVENT SHAP EXPLANATION</div>
                  <span className="text-[10px] text-cyber-muted border border-white/10 rounded-full px-2 py-0.5">{current.explanation.method}</span>
                </div>
                <p className="text-sm text-cyber-text mt-2 leading-relaxed">{current.explanation.summary}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {current.explanation.top_features.slice(0, 5).map((feature) => (
                    <span key={feature.feature} className={`text-[10px] px-2 py-1 rounded border ${feature.direction === 'supports' ? 'border-cyber-red/30 bg-cyber-red/5 text-cyber-text' : 'border-white/10 text-cyber-muted'}`}>
                      {feature.feature}: {feature.direction} ({feature.impact > 0 ? '+' : ''}{feature.impact.toFixed(2)})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeAlert && (
          <div className={`glass-card p-5 border ${activeAlert.title === 'POTENTIAL UNKNOWN THREAT' ? 'border-yellow-400/50 bg-yellow-400/10' : 'border-cyber-red/50 bg-cyber-red/10'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-6 h-6 shrink-0 ${activeAlert.title === 'POTENTIAL UNKNOWN THREAT' ? 'text-yellow-400' : 'text-cyber-red'}`} />
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-black tracking-widest ${activeAlert.title === 'POTENTIAL UNKNOWN THREAT' ? 'text-yellow-400' : 'text-cyber-red'}`}>
                  {activeAlert.title}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
                  <div><span className="text-cyber-muted block uppercase tracking-wider">Attack</span><strong className="text-cyber-text">{activeAlert.attack}</strong></div>
                  <div><span className="text-cyber-muted block uppercase tracking-wider">Risk</span><strong className="text-cyber-text">{activeAlert.risk_score.toFixed(1)}/100</strong></div>
                  <div><span className="text-cyber-muted block uppercase tracking-wider">Future Risk</span><strong className="text-cyber-text">{activeAlert.future_probability.toFixed(1)}%</strong></div>
                </div>
                <div className="mt-3 text-xs text-cyber-text"><span className="text-cyber-muted uppercase tracking-wider">Recommended Action: </span>{activeAlert.recommended_action}</div>
              </div>
              <button onClick={() => setActiveAlert(null)} className="text-cyber-muted hover:text-white" aria-label="Dismiss alert"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {current?.unknown_pattern?.is_unknown && (
          <div className="flex items-center gap-2 text-xs text-yellow-400 border border-yellow-400/30 bg-yellow-400/5 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4" />
            Potential unknown attack pattern: {current.unknown_pattern.reason} Anomaly score {current.unknown_pattern.anomaly_score.toFixed(1)}/100.
          </div>
        )}

        {(liveOverview || overviewError) && (
          <div className="glass-card p-5 border-cyber-blue/25 bg-cyber-blue/5">
            <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyber-blue mb-2">
              <Sparkles className="w-4 h-4" />
              AI LIVE MONITORING OVERVIEW
              <span className="ml-auto text-[10px] text-cyber-muted font-normal tracking-normal">Read-only snapshot</span>
            </div>
            {overviewError ? (
              <p className="text-sm text-cyber-red">{overviewError}</p>
            ) : (
              <p className="text-sm text-cyber-text whitespace-pre-wrap leading-relaxed">{liveOverview}</p>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            MAIN CONTENT: LEFT (chart+upload) | RIGHT (lstm+donut)
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

          {/* ── LEFT PANEL ──────────────────────────── */}
          <div className="glass-card p-5 flex flex-col gap-4">
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyber-cyan text-sm font-bold tracking-wider">
                <Activity className="w-4 h-4" />
                Live Network Telemetry &amp; Multi-Class Attack Detector
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyber-green/40 bg-cyber-green/10 text-cyber-green text-[11px] font-bold tracking-widest">
                <span className={`w-1.5 h-1.5 rounded-full bg-cyber-green ${isRunning ? 'status-dot' : ''}`} />
                {isRunning ? 'LIVE SCANNING' : simStatus === 'done' ? 'SCAN COMPLETE' : 'READY'}
              </div>
            </div>

            {/* Preset buttons */}
            <div>
              <div className="text-[10px] text-cyber-muted font-bold tracking-widest uppercase mb-2">
                Quick Attack Simulation Presets (CICIDS2017 Dataset)
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPreset(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      preset === p
                        ? 'border-cyber-cyan/60 bg-cyber-cyan/15 text-cyber-cyan shadow-cyan'
                        : 'border-white/10 bg-white/3 text-cyber-muted hover:border-cyber-cyan/30 hover:text-cyber-text'
                    }`}
                  >
                    {p === 'ddos'         && <Zap className="w-3 h-3 text-cyber-red" />}
                    {p === 'portscan'     && <Eye className="w-3 h-3 text-yellow-400" />}
                    {p === 'web'          && <Brain className="w-3 h-3 text-purple-400" />}
                    {p === 'infiltration' && <AlertTriangle className="w-3 h-3 text-cyber-red" />}
                    {p === 'benign'       && <Activity className="w-3 h-3 text-cyber-green" />}
                    {PRESET_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Start / Stop controls — no upload needed */}
            {simStatus === 'idle' || simStatus === 'error' ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={onStart}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyber-cyan text-cyber-bg font-bold tracking-widest text-sm hover:bg-cyber-cyan/90 transition-colors shadow-cyan"
                >
                  <Play className="w-4 h-4" />
                  START LIVE SCAN
                </button>
                {simStatus === 'error' && (
                  <div className="text-cyber-red text-xs font-semibold bg-cyber-red/5 border border-cyber-red/30 rounded-lg p-3">
                    {errorMsg}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full bg-cyber-green ${isRunning ? 'status-dot' : ''}`} />
                  <span className="text-cyber-green font-semibold">
                    {isRunning ? 'Live Stream Active' : 'Analysis Complete'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {isRunning && (
                    <button onClick={onStop}
                      className="px-3 py-1 rounded border border-cyber-red/40 text-cyber-red hover:bg-cyber-red/10 transition-colors">
                      Stop
                    </button>
                  )}
                  <button onClick={() => { setSimStatus('idle'); setCurrent(null); setFlows([]) }}
                    className="px-3 py-1 rounded border border-white/10 text-cyber-muted hover:border-cyber-cyan/30 hover:text-cyber-cyan transition-colors">
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* ── Dual chart: Risk Score + Traffic Rate ── */}
            <div className="flex-1 min-h-0">
              {/* Legend */}
              <div className="flex items-center gap-4 mb-2">
                <span className="flex items-center gap-1.5 text-[11px] text-cyber-muted">
                  <span className="inline-block w-6 h-0.5 bg-cyber-red rounded" />
                  Attack Risk Score (%)
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-cyber-muted">
                  <span className="inline-block w-6 h-0.5 bg-cyber-cyan rounded" />
                  Network Traffic Rate (Mbps)
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#7d99aa', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="risk"    orientation="left"  domain={[0, 100]}  tick={{ fill: '#7d99aa', fontSize: 10 }} />
                  <YAxis yAxisId="traffic" orientation="right" domain={[0, 1400]} tick={{ fill: '#7d99aa', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(7,17,28,0.97)', border: '1px solid rgba(0,245,212,0.25)', borderRadius: 10, color: '#e8f7ff', fontSize: 11 }}
                    labelStyle={{ color: '#7d99aa', marginBottom: 4 }}
                  />
                  <Line yAxisId="risk"    type="monotone" dataKey="risk"    name="Risk Score"   stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} />
                  <Line yAxisId="traffic" type="monotone" dataKey="traffic" name="Traffic Mbps" stroke="#00f5d4" strokeWidth={2} dot={{ r: 3, fill: '#00f5d4' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── RIGHT PANEL ─────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* LSTM Forecast Chart */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                  PyTorch LSTM Attack Forecaster
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-400 font-bold tracking-wider">
                  Time-Series DL
                </span>
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={lstmChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.08)" />
                  <XAxis dataKey="label" tick={{ fill: '#7d99aa', fontSize: 9 }} interval={2} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#7d99aa', fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(7,17,28,0.97)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, color: '#e8f7ff', fontSize: 11 }}
                    formatter={(v: number) => [`${v}%`, 'Attack Probability']}
                  />
                  <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2}
                    dot={{ r: 3, fill: '#a855f7', stroke: '#a855f7' }} activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Multi-Class Threat Distribution Donut */}
            <div className="glass-card p-5 flex-1">
              <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyber-cyan mb-4">
                <Activity className="w-4 h-4" />
                Multi-Class Threat Distribution
              </div>

              <div className="flex items-center gap-4">
                {/* Donut */}
                <div className="shrink-0">
                  <ResponsiveContainer width={150} height={150}>
                    <PieChart>
                      <Pie
                        data={distribution.length > 0 ? distribution : [{ attack: 'IDLE', count: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={68}
                        paddingAngle={2}
                        dataKey="count"
                        stroke="none"
                      >
                        {(distribution.length > 0 ? distribution : [{ attack: 'IDLE', count: 1 }]).map((d, i) => (
                          <Cell
                            key={i}
                            fill={colorForAttack(d.attack)}
                            style={{ filter: `drop-shadow(0 0 6px ${colorForAttack(d.attack)}88)` }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2">
                  {(distribution.length > 0 ? distribution : [{ attack: 'BENIGN', count: 0 }]).slice(0, 5).map((d) => (
                    <div key={d.attack} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: colorForAttack(d.attack), boxShadow: `0 0 6px ${colorForAttack(d.attack)}88` }}
                      />
                      <span className="text-xs font-bold text-cyber-text truncate flex-1">{d.attack}</span>
                      <span className="text-xs text-cyber-muted">
                        {d.attack === 'BENIGN' ? 'Normal Traffic' :
                         d.attack.includes('DDOS') ? 'Flood Attack' :
                         d.attack.includes('SCAN') ? 'Recon' :
                         d.attack.includes('WEB') ? 'SQLi/XSS' : 'Anomaly'}
                      </span>
                      <strong className="text-xs ml-1" style={{ color: colorForAttack(d.attack) }}>{d.count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color key */}
              <div className="mt-3 p-2.5 rounded-lg border border-white/5 bg-white/2">
                <div className="text-[9px] text-cyber-muted uppercase tracking-widest mb-1.5">Color Key</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '🟢 Green = Safe',  bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)',  color: '#10b981' },
                    { label: '🔴 Red = DDoS',    bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',   color: '#f87171' },
                    { label: '🟡 Amber = Scan',  bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)',  color: '#fbbf24' },
                    { label: '🟣 Violet = Web',  bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)',  color: '#a78bfa' },
                  ].map((k) => (
                    <span key={k.label} className="text-[10px] px-2 py-0.5 rounded-full border font-semibold"
                      style={{ background: k.bg, borderColor: k.border, color: k.color }}>
                      {k.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            FLOW TELEMETRY TABLE
        ══════════════════════════════════════════════ */}
        <div className="glass-card overflow-hidden">
          {/* Table toolbar */}
          <div className="flex items-center justify-between gap-4 p-4 border-b border-cyber-cyan/10 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-bold text-cyber-text">
              <Activity className="w-4 h-4 text-cyber-cyan" />
              Analyzed Network Flow Telemetry &amp; Anomaly Log
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter pills */}
              <div className="flex gap-1.5">
                {(['ALL', 'CRITICAL', 'HIGH', 'BENIGN'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setSearch('') }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wider transition-all ${
                      filter === f
                        ? 'bg-cyber-cyan text-cyber-bg'
                        : 'border border-white/10 text-cyber-muted hover:border-cyber-cyan/30 hover:text-cyber-text'
                    }`}
                  >
                    {f === 'ALL' ? 'All Flows' : f === 'BENIGN' ? 'Benign Only' : f}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setFilter('ALL') }}
                placeholder="Search IP, Port, or Attack..."
                className="bg-white/3 border border-white/10 rounded-lg px-3 py-1 text-xs text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/40 w-52"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0a1628] border-b border-cyber-cyan/10 z-10">
                <tr>
                  {['FLOW ID', 'TIMESTAMP', 'SOURCE IP', 'DESTINATION IP', 'DEST PORT', 'PROTO',
                    'RANDOM FOREST STATUS', 'MULTI-CLASS AI DETECTION', 'RISK SCORE', 'ACTION'].map((h) => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold tracking-widest text-cyber-muted uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFlows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-cyber-muted">
                      {simStatus === 'idle'
                        ? 'Upload a CSV and start the simulation to see live flow data.'
                        : 'No flows match the current filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredFlows.map((f, i) => {
                    const isMal = f.attack.toUpperCase() !== 'BENIGN'
                    const aColor = colorForAttack(f.attack)
                    const rfColor = isMal ? '#ff9100' : '#10b981'
                    const rfBg   = isMal ? 'rgba(255,145,0,0.12)' : 'rgba(16,185,129,0.12)'
                    const rfBord = isMal ? 'rgba(255,145,0,0.4)'  : 'rgba(16,185,129,0.4)'
                    const barW   = Math.max(4, Math.min(100, f.riskScore))

                    return (
                      <tr key={`${f.id}-${i}`}
                        className="border-b border-white/3 hover:bg-cyber-cyan/3 transition-colors">

                        {/* Flow ID */}
                        <td className="py-2.5 px-3 font-mono text-cyber-cyan font-semibold whitespace-nowrap">{f.id}</td>

                        {/* Timestamp */}
                        <td className="py-2.5 px-3 font-mono text-cyber-muted whitespace-nowrap">{f.timestamp}</td>

                        {/* Src IP */}
                        <td className="py-2.5 px-3 font-mono text-cyber-text whitespace-nowrap">{f.src}</td>

                        {/* Dst IP */}
                        <td className="py-2.5 px-3 font-mono text-cyber-text whitespace-nowrap">{f.dst}</td>

                        {/* Port */}
                        <td className="py-2.5 px-3">
                          <span className="text-cyber-cyan font-mono font-semibold">{f.dstPort}</span>
                        </td>

                        {/* Protocol */}
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded border border-cyber-cyan/30 bg-cyber-cyan/5 text-cyber-cyan font-mono text-[10px]">
                            {f.proto}
                          </span>
                        </td>

                        {/* RF Status */}
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border"
                            style={{ color: rfColor, background: rfBg, borderColor: rfBord }}>
                            {f.rfStatus}
                          </span>
                        </td>

                        {/* AI Detection */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold" style={{ color: aColor }}>{f.attack}</div>
                          <div className="text-cyber-muted" style={{ fontSize: 10 }}>{f.confidence.toFixed(0)}% confidence</div>
                        </td>

                        {/* Risk Score */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-cyber-text w-8 shrink-0">{f.riskScore.toFixed(1)}</span>
                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${barW}%`, background: aColor, boxShadow: `0 0 4px ${aColor}88` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Inspect */}
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => setInspect(f)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded border border-cyber-cyan/30 text-cyber-cyan text-[10px] font-semibold hover:bg-cyber-cyan/10 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          INSPECT MODAL
      ══════════════════════════════════════════════ */}
      {inspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setInspect(null)}>
          <div className="glass-card w-full max-w-lg mx-4 p-6 border-cyber-cyan/30"
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-cyber-red" />
                <h3 className="font-bold text-cyber-text">Threat Anomaly Breakdown</h3>
              </div>
              <button onClick={() => setInspect(null)}
                className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-cyber-muted hover:text-cyber-red transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Detail rows */}
            <div className="space-y-3 text-sm">
              {[
                ['Flow ID',          inspect.id],
                ['Timestamp',        inspect.timestamp],
                ['Source IP',        inspect.src],
                ['Destination IP',   inspect.dst],
                ['Destination Port', inspect.dstPort],
                ['Protocol',         inspect.proto],
                ['RF Status',        inspect.rfStatus],
                ['AI Detection',     inspect.attack],
                ['Confidence',       `${inspect.confidence.toFixed(1)}%`],
                ['Risk Score',       `${inspect.riskScore.toFixed(1)} / 100`],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-center gap-3 py-2 border-b border-white/5">
                  <span className="w-36 shrink-0 text-cyber-muted text-xs font-semibold uppercase tracking-wider">{k}</span>
                  <span className="font-mono text-cyber-text text-xs">{String(v)}</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setInspect(null)}
                className="px-4 py-2 rounded-lg border border-white/10 text-cyber-muted text-xs font-semibold hover:border-cyber-cyan/30 hover:text-cyber-cyan transition-colors">
                Close
              </button>
              <button className="px-4 py-2 rounded-lg bg-cyber-red/90 text-white text-xs font-bold hover:bg-cyber-red transition-colors flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Apply Automated Firewall Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
