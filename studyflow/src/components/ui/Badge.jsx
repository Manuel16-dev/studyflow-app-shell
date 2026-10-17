import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

const variants = {
  info: { classes: 'bg-primary-light text-primary-text', Icon: Info },
  mastered: { classes: 'bg-secondary-light text-secondary-text', Icon: CheckCircle2 },
  attention: { classes: 'bg-accent-light text-accent-text', Icon: AlertTriangle },
  weak: { classes: 'bg-danger-light text-danger-text', Icon: AlertCircle },
}

export default function Badge({ variant = 'info', children }) {
  const { classes, Icon } = variants[variant]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      <Icon className="w-3 h-3" />
      {children}
    </span>
  )
}
