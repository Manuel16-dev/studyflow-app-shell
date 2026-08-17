// Hand-rolled instead of pulling in a charting library — spec section 10
// leaves the charting library choice open for implementation, and these are
// simple enough that a dependency isn't worth the bundle cost. Revisit if
// later screens (Exams, Planner) need something more complex.
export default function SimpleBarChart({ data, unit = '', color = 'var(--color-primary)', summary }) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div>
      {/* Accessible text alternative per spec section 9 — charts need a
          textual summary, not just visual bars. */}
      {summary && <p className="sr-only">{summary}</p>}
      <div className="flex items-end gap-2 h-32" role="img" aria-label={summary}>
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
            <span className="text-[11px] text-neutral-500 tabular-nums">{d.value}{unit}</span>
            <div
              className="w-full rounded-t-sm"
              style={{ height: `${(d.value / max) * 100}%`, backgroundColor: color, minHeight: 4 }}
              title={`${d.label}: ${d.value}${unit}`}
            />
            <span className="text-[11px] text-neutral-500">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
