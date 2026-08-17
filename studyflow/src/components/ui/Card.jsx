export default function Card({ title, action, children, className = '' }) {
  return (
    <div className={`bg-white border border-neutral-200 rounded-lg p-5 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
