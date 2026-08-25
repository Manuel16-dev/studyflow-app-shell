const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark disabled:bg-neutral-200 disabled:text-neutral-500',
  secondary: 'bg-surface text-neutral-700 border border-neutral-300 hover:bg-neutral-50 disabled:text-neutral-300 disabled:bg-neutral-50',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 disabled:text-neutral-300',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-neutral-200 disabled:text-neutral-500',
}

export default function Button({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors',
        'disabled:cursor-not-allowed',
        variants[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
