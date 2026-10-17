import Card from '../ui/Card'
import { levelInfo } from '../../lib/xpStore'

// Level badge, XP total and progress to the next level. `summary` is the
// object from xpStore.getXpSummary(), or null while it loads.
export default function LevelCard({ summary, className = '' }) {
  if (!summary) {
    return (
      <Card className={className}>
        <p className="text-sm text-neutral-500">Loading your level…</p>
      </Card>
    )
  }

  const info = levelInfo(summary.totalXp)

  return (
    <Card className={className}>
      <div className="flex items-center gap-4">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-light text-primary-text shrink-0"
          aria-hidden="true"
        >
          <span className="text-lg font-semibold tabular-nums">{info.level}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-neutral-900">Level {info.level}</p>
            <p className="text-xs text-neutral-500 tabular-nums">{info.xp.toLocaleString()} XP</p>
          </div>
          <div
            className="h-2 rounded-full bg-neutral-100 mt-2 overflow-hidden"
            role="progressbar"
            aria-label={`Progress to level ${info.level + 1}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={info.percent}
          >
            <div className="h-full bg-primary rounded-full" style={{ width: `${info.percent}%` }} />
          </div>
          <p className="text-xs text-neutral-500 mt-1.5">
            {info.toNext.toLocaleString()} XP to level {info.level + 1}
            {summary.todayXp > 0 ? ` · +${summary.todayXp.toLocaleString()} XP today` : ''}
          </p>
        </div>
      </div>
    </Card>
  )
}
