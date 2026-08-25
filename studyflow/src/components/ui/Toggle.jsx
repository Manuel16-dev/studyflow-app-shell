export default function Toggle({ id, label, description, checked, onChange, disabled = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-neutral-900 block">
          {label}
        </label>
        {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
          disabled ? 'bg-neutral-200 cursor-not-allowed' : checked ? 'bg-primary' : 'bg-neutral-300',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4.5 w-4.5 transform rounded-full bg-surface shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
