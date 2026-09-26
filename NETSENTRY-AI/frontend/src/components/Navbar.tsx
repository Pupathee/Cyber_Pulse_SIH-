import { Link, useLocation } from 'react-router-dom'
import { ShieldCheck, Activity, Database, Bot, History, BarChart3 } from 'lucide-react'

export default function Navbar() {
  const { pathname } = useLocation()

  const navLinks = [
    { to: '/live-monitoring',  label: 'Live Monitoring',  Icon: Activity },
    { to: '/dataset-detection', label: 'Dataset Detection', Icon: Database },
    { to: '/ai-assistant',     label: 'AI Assistant',      Icon: Bot },
    { to: '/attack-history',   label: 'Attack History',    Icon: History },
    { to: '/analytics',        label: 'Analytics',         Icon: BarChart3 },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-cyber-border bg-cyber-bg/95 backdrop-blur-md">
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/live-monitoring" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center group-hover:bg-cyber-cyan/20 transition-colors">
            <ShieldCheck className="w-5 h-5 text-cyber-cyan" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-widest text-cyber-cyan glow-cyan">
              NETSENTRY AI
            </div>
            <div className="text-[10px] text-cyber-muted tracking-widest uppercase">
              Network Attack Forecasting
            </div>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ to, label, Icon }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30 shadow-cyan'
                    : 'text-cyber-muted hover:text-cyber-text hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyber-green/30 bg-cyber-green/5">
          <span className="status-dot bg-cyber-green" />
          <span className="text-xs font-bold text-cyber-green tracking-widest">AI ENGINE ONLINE</span>
        </div>
      </div>
    </nav>
  )
}
