// =========================================================
// NETSENTRY AI — Frontend API Service
// All calls go through Vite's proxy → FastAPI at :8000
// =========================================================

const BASE = '/api'

export interface ModelStatus {
  status: string
  detection_engine: string
  forecast_engine: string
  attack_classes: string[]
  num_classes: number
  rf_features: number
  compute: string
}

export interface DatasetAnalysisResult {
  dataset_name: string
  num_records: number
  num_features: number
  attack_type: string
  detection_confidence: number
  unknown_pattern?: {
    is_unknown: boolean
    anomaly_score: number
    max_probability?: number
    class_margin?: number
    reason: string
  }
  future_probability: number
  risk_score: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommended_action: string
  feature_importance: { feature: string; importance: number }[]
  attack_distribution: { attack: string; count: number }[]
  risk_data: { index: number; risk_score: number; attack: string }[]
}

export interface LiveEvent {
  record: number
  total: number
  attack_type: string
  detection_confidence: number
  future_probability: number
  risk_score: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommended_action: string
  explanation?: {
    method: string
    attack_type: string
    summary: string
    top_features: { feature: string; value: number; impact: number; direction: string }[]
  }
  unknown_pattern?: {
    is_unknown: boolean
    anomaly_score: number
    max_probability?: number
    class_margin?: number
    reason: string
  }
  alert?: {
    title: string
    attack: string
    risk_score: number
    future_probability: number
    recommended_action: string
  } | null
  event?: string
}

export interface Alert {
  timestamp: string
  attack_type: string
  confidence: number
  future_probability: number
  risk_score: number
  risk_level: string
  recommended_action: string
  record_index?: number
  alert_type?: string
  unknown_pattern?: boolean
  anomaly_score?: number
}

export interface AnalyticsResult {
  attack_distribution: { attack: string; count: number }[]
  risk_trend: { index: number; risk_score: number; attack: string }[]
  future_probability: { index: number; probability: number }[]
  total_monitored_traffic: number
  high_risk_events: number
  total_alerts: number
}

// ── Health ────────────────────────────────────────────────
export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/health`)
  return res.json()
}

export async function fetchModelStatus(): Promise<ModelStatus> {
  const res = await fetch(`${BASE}/model-status`)
  return res.json()
}

// ── Dataset ───────────────────────────────────────────────
export async function analyzeDataset(file: File): Promise<DatasetAnalysisResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/dataset/analyze`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Analysis failed')
  }
  return res.json()
}

// ── Live ──────────────────────────────────────────────────
export async function startLive(file: File): Promise<{ status: string; num_records: number }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/live/start`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Failed to start live monitoring')
  }
  return res.json()
}

/** Opens an SSE connection to /api/live/events and calls onEvent for each message.
 *  The stream is continuous (loops forever) — call es.close() to stop it.
 *  'loop' events are ignored silently.
 */
export function subscribeToLiveEvents(
  onEvent: (event: LiveEvent) => void,
  onComplete: () => void,
  onError: (e: Event) => void
): EventSource {
  const es = new EventSource(`${BASE}/live/events`)
  es.onmessage = (e) => {
    try {
      const data: LiveEvent = JSON.parse(e.data)
      // 'loop' = pass boundary, just ignore. 'complete' = legacy one-shot mode.
      if (data.event === 'complete') {
        onComplete()
        es.close()
      } else if (!data.event) {
        // Normal progress event
        onEvent(data)
      }
      // 'loop' events are intentionally ignored
    } catch {
      // ignore parse errors
    }
  }
  es.onerror = (e) => {
    onError(e)
    es.close()
  }
  return es
}

// ── Alerts ────────────────────────────────────────────────
export async function fetchAlerts(): Promise<{ alerts: Alert[]; count: number }> {
  const res = await fetch(`${BASE}/alerts`)
  return res.json()
}

export async function clearAlerts(): Promise<void> {
  await fetch(`${BASE}/alerts/clear`, { method: 'POST' })
}

export async function fetchAnalytics(): Promise<AnalyticsResult> {
  const res = await fetch(`${BASE}/analytics`)
  const data = await res.json().catch(() => ({ detail: res.statusText }))
  if (!res.ok) throw new Error(data.detail ?? 'Could not load analytics')
  return data
}

export interface AssistantResponse {
  reply: string
  source: string
}

export async function askAssistant(message: string): Promise<AssistantResponse> {
  const res = await fetch(`${BASE}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  const data = await res.json().catch(() => ({ detail: res.statusText }))
  if (!res.ok) throw new Error(data.detail ?? 'Assistant request failed')
  return data
}

export async function generateLiveOverview(): Promise<AssistantResponse> {
  const res = await fetch(`${BASE}/assistant/live-overview`, { method: 'POST' })
  const data = await res.json().catch(() => ({ detail: res.statusText }))
  if (!res.ok) throw new Error(data.detail ?? 'Could not generate live overview')
  return data
}
