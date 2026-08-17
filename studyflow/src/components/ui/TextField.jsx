export default function TextField({ id, label, error, type = 'text', ...props }) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={[
          'w-full rounded-md border px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400',
          'focus-visible:outline-2 focus-visible:outline-primary',
          error ? 'border-danger' : 'border-neutral-300',
        ].join(' ')}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
