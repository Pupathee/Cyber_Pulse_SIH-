type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface RiskBadgeProps {
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
}

const styles: Record<RiskLevel, string> = {
  LOW:      'bg-cyber-green/10 text-cyber-green   border-cyber-green/30',
  MEDIUM:   'bg-yellow-400/10  text-yellow-400    border-yellow-400/30',
  HIGH:     'bg-cyber-orange/10 text-cyber-orange border-cyber-orange/30',
  CRITICAL: 'bg-cyber-red/10   text-cyber-red     border-cyber-red/30',
}

const dotStyles: Record<RiskLevel, string> = {
  LOW:      'bg-cyber-green',
  MEDIUM:   'bg-yellow-400',
  HIGH:     'bg-cyber-orange',
  CRITICAL: 'bg-cyber-red',
}

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export default function RiskBadge({ level, size = 'md', showDot = true }: RiskBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold tracking-widest ${styles[level]} ${sizeStyles[size]}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full status-dot ${dotStyles[level]}`} />}
      {level}
    </span>
  )
}
