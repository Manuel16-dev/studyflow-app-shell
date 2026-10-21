import { Pencil, Trash2, PauseCircle, PlayCircle } from 'lucide-react'

// `onToggleSuspend` is optional: pass it to show the suspend/restore button.
export default function CardListItem({ card, onEdit, onDelete, onToggleSuspend, subjectLabel, topicLabel }) {
  return (
    <div
      className={`flex items-start justify-between gap-4 bg-surface border border-neutral-200 rounded-lg p-4 ${card.suspended ? 'opacity-60' : ''}`}
    >
      <div className="min-w-0 flex-1">
        {subjectLabel && (
          <p className="text-xs font-medium text-primary-text mb-1 truncate">{subjectLabel}</p>
        )}
        <p className="text-sm font-medium text-neutral-900 truncate">{card.front}</p>
        <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{card.back}</p>
        {(card.suspended || topicLabel || card.kind === 'practice' || card.sourceRef || card.source_ref || card.tags?.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {card.suspended && (
              <span className="rounded-full bg-neutral-200 text-neutral-700 px-2 py-0.5 text-[11px] font-medium">
                Suspended
              </span>
            )}
            {topicLabel && (
              <span className="rounded-full bg-primary-light text-primary-text px-2 py-0.5 text-[11px] font-medium">
                {topicLabel}
              </span>
            )}
            {card.kind === 'practice' && (
              <span className="rounded-full bg-violet-light text-violet-text px-2 py-0.5 text-[11px] font-medium">
                Practice
              </span>
            )}
            {(card.sourceRef || card.source_ref) && (
              <span className="text-[11px] text-neutral-500">Source: {card.sourceRef ?? card.source_ref}</span>
            )}
            {card.tags?.map((t) => (
              <span key={t} className="rounded-full bg-neutral-100 text-neutral-700 px-2 py-0.5 text-[11px]">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onToggleSuspend && (
          <button
            type="button"
            onClick={() => onToggleSuspend(card)}
            aria-label={`${card.suspended ? 'Restore' : 'Suspend'} card: ${card.front}`}
            title={card.suspended ? 'Restore to reviews' : 'Suspend (hide from reviews)'}
            className="p-2 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          >
            {card.suspended ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(card)}
          aria-label={`Edit card: ${card.front}`}
          className="p-2 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(card)}
          aria-label={`Delete card: ${card.front}`}
          className="p-2 rounded-md text-neutral-500 hover:bg-danger-light hover:text-danger-text"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
