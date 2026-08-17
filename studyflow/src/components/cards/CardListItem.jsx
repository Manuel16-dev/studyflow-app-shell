import { Pencil, Trash2 } from 'lucide-react'

export default function CardListItem({ card, onEdit, onDelete }) {
  return (
    <div className="flex items-start justify-between gap-4 bg-white border border-neutral-200 rounded-lg p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900 truncate">{card.front}</p>
        <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{card.back}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
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
          className="p-2 rounded-md text-neutral-500 hover:bg-danger-light hover:text-danger"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
