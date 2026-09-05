const variants = {
  primary: 'rounded-md bg-primary text-white hover:bg-primary-dark disabled:bg-neutral-200 disabled:text-neutral-500',
  secondary: 'rounded-md bg-surface text-neutral-700 border border-neutral-300 hover:bg-neutral-50 disabled:text-neutral-300 disabled:bg-neutral-50',
  ghost: 'rounded-md bg-transparent text-neutral-700 hover:bg-neutral-100 disabled:text-neutral-300',
  danger: 'rounded-md bg-danger text-white hover:bg-danger/90 disabled:bg-neutral-200 disabled:text-neutral-500',
  // Gradient accent CTA — reserved for the single primary "create" action on
  // a screen (e.g. Planner's Add block). Full pill + glow shadow, matching
  // the reference mockups' bold hero-button treatment rather than a flat
  // rounded-rect fill.
  gradient: 'rounded-full bg-gradient-to-r from-primary to-violet text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0',
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
        'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150',
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
