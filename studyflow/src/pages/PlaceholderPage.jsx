export default function PlaceholderPage({ title, description }) {
  return (
    <div className="flex flex-col items-start gap-2 p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      {description && (
        <p className="text-neutral-500 max-w-prose">{description}</p>
      )}
      <div className="mt-6 w-full rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
        {title} screen — coming next in the build order.
      </div>
    </div>
  )
}
