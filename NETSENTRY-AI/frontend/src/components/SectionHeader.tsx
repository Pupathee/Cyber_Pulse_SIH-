import { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export default function SectionHeader({ title, description, icon, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/20 flex items-center justify-center text-cyber-cyan">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-base font-bold tracking-widest text-cyber-cyan uppercase">{title}</h2>
          {description && (
            <p className="text-xs text-cyber-muted mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
