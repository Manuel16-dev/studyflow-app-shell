export default function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-neutral-50">
      <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-white font-semibold text-xl">
        S
      </div>
      <p className="text-sm text-neutral-400 animate-pulse">Loading StudyFlow…</p>
    </div>
  )
}
