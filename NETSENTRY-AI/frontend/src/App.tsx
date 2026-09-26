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
      </div>
    </BrowserRouter>
  )
}
