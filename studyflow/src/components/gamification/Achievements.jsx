import { Sparkles, Flame, Layers, Trophy, Lock, X, Target, Zap, GraduationCap } from 'lucide-react'

const KIND_ICON = {
  first: Sparkles,
  streak: Flame,
  reviews: Layers,
  mastery: Trophy,
  goal: Target,
  recall: Zap,
  exam: GraduationCap,
}
const GROUP_ORDER = ['Reviews', 'Consistency', 'Mastery', 'Exams']

function AchievementCard({ a }) {
  const unlocked = !!a.unlockedAt
  const Icon = unlocked ? KIND_ICON[a.kind] ?? Trophy : Lock
  const pct = Math.round((a.current / a.target) * 100)
  return (
    <li className="flex items-start gap-3 border border-neutral-200 rounded-lg p-3">
      <span
        className={`flex items-center justify-center w-9 h-9 rounded-md shrink-0 ${
          unlocked ? 'bg-secondary-light text-secondary-text' : 'bg-neutral-100 text-neutral-500'
        }`}
        aria-hidden="true"
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-neutral-900 truncate">{a.title}</p>
          <span className="text-xs text-neutral-500 shrink-0 tabular-nums">
            {unlocked ? `+${a.xp} XP` : 'Locked'}
          </span>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">{a.description}</p>
        {!unlocked && (
          <div
            className="h-1.5 rounded-full bg-neutral-100 mt-2 overflow-hidden"
            role="progressbar"
            aria-label={`${a.title} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </li>
  )
}

// Every achievement, unlocked or not, under a heading per group.
// `items` comes from xpStore.syncAchievements().
export default function AchievementList({ items }) {
  const groups = GROUP_ORDER.map((name) => ({
    name,
    list: items.filter((a) => a.group === name),
  })).filter((g) => g.list.length > 0)

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.name} aria-label={g.name}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
            {g.name} · {g.list.filter((a) => a.unlockedAt).length}/{g.list.length}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {g.list.map((a) => (
              <AchievementCard key={a.key} a={a} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

// Dismissible "unlocked" notice. `unlocked` is syncAchievements().newlyUnlocked.
export function AchievementBanner({ unlocked, onDismiss }) {
  if (!unlocked || unlocked.length === 0) return null
  const totalXp = unlocked.reduce((sum, a) => sum + a.xp, 0)
  const shown = unlocked.slice(0, 3).map((a) => a.title)
  const extra = unlocked.length - shown.length

  return (
    <div
      role="status"
      className="flex items-start gap-3 bg-secondary-light border border-neutral-200 rounded-lg p-4"
    >
      <span className="flex items-center justify-center w-9 h-9 rounded-md bg-surface text-secondary-text shrink-0" aria-hidden="true">
        <Trophy className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900">
          {unlocked.length === 1 ? 'Achievement unlocked' : `${unlocked.length} achievements unlocked`}
        </p>
        <p className="text-xs text-neutral-700 mt-0.5">
          {shown.join(', ')}
          {extra > 0 ? ` and ${extra} more` : ''} · +{totalXp} XP
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="p-1.5 -mr-1.5 -mt-1.5 rounded-md text-neutral-500 hover:bg-neutral-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
