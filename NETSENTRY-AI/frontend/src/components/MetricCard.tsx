import { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  accent?: 'cyan' | 'green' | 'orange' | 'red' | 'blue'
  description?: string
  className?: string
}

const accentMap = {
  cyan:   { border: 'border-cyber-cyan/20',   text: 'text-cyber-cyan',   glow: 'shadow-cyan',   bg: 'bg-cyber-cyan/5'   },
  green:  { border: 'border-cyber-green/20',  text: 'text-cyber-green',  glow: 'shadow-green',  bg: 'bg-cyber-green/5'  },
  orange: { border: 'border-cyber-orange/20', text: 'text-cyber-orange', glow: 'shadow-orange', bg: 'bg-cyber-orange/5' },
  red:    { border: 'border-cyber-red/20',    text: 'text-cyber-red',    glow: 'shadow-red',    bg: 'bg-cyber-red/5'    },
  blue:   { border: 'border-cyber-blue/20',   text: 'text-cyber-blue',   glow: 'shadow-blue',   bg: 'bg-cyber-blue/5'   },
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accent = 'cyan',
  description,
  className = '',
}: MetricCardProps) {
  const a = accentMap[accent]

  return (
    <div className={`glass-card p-5 flex flex-col gap-3 ${a.border} ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-cyber-muted uppercase">{title}</span>
        {icon && (
          <div className={`w-8 h-8 rounded-lg ${a.bg} border ${a.border} flex items-center justify-center ${a.text}`}>
            {icon}
          </div>
        )}
      </div>

      <div className={`text-2xl font-black tracking-tight ${a.text}`}>{value}</div>

      {subtitle && (
        <div className="text-xs text-cyber-muted font-mono">{subtitle}</div>
      )}

      {description && (
        <p className="text-xs text-cyber-muted leading-relaxed mt-auto border-t border-white/5 pt-3">
          {description}
        </p>
      )}
    </div>
  )
}
