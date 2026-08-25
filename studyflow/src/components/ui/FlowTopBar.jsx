import { ChevronLeft, X } from 'lucide-react'

export default function FlowTopBar({ title, onBack, onClose }) {
  return (
    <header className="flex items-center h-14 px-3 border-b border-neutral-200 bg-surface sticky top-0">
      <div className="w-9">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-1 rounded-md text-neutral-700 hover:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>
      <h1 className="flex-1 text-center text-sm font-semibold text-neutral-900">{title}</h1>
      <div className="w-9 flex justify-end">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 rounded-md text-neutral-700 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  )
}
