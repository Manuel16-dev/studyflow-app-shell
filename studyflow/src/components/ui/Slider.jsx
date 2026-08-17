export default function Slider({
  id,
  label,
  description,
  min,
  max,
  step = 1,
  value,
  onChange,
  minLabel,
  maxLabel,
  valueLabel,
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-neutral-900">
          {label}
        </label>
        <span className="text-sm font-semibold text-primary shrink-0">{valueLabel ?? value}</span>
      </div>
      {description && <p className="text-xs text-neutral-500 mt-0.5 mb-2">{description}</p>}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary mt-2"
      />
      {(minLabel || maxLabel) && (
        <div className="flex items-center justify-between text-xs text-neutral-500 mt-1">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  )
}
