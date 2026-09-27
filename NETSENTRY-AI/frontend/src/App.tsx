import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar            from './components/Navbar'
import LiveMonitoring    from './pages/LiveMonitoring'
import DatasetDetection  from './pages/DatasetDetection'
import AIAssistant       from './pages/AIAssistant'
import AttackHistory     from './pages/AttackHistory'
import Analytics         from './pages/Analytics'

export default function App() {
  return (
    <BrowserRouter>
      <div className="relative">
        <Navbar />
        <Routes>
          <Route path="/"                  element={<Navigate to="/live-monitoring" replace />} />
          <Route path="/live-monitoring"   element={<LiveMonitoring />} />
          <Route path="/dataset-detection" element={<DatasetDetection />} />
          <Route path="/ai-assistant"     element={<AIAssistant />} />
          <Route path="/attack-history"   element={<AttackHistory />} />
          <Route path="/analytics"        element={<Analytics />} />
        </Routes>
        <footer className="border-t border-cyber-border/60 bg-cyber-bg/80 px-6 py-4 text-center">
          <p className="text-xs tracking-wide text-cyber-muted">
            Copyright (c) 2026 Cyber_Xcurve. All rights reserved.
          </p>
        </footer>
      </div>
    </BrowserRouter>
  )
}
