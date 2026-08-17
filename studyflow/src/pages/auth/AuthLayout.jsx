import { BookOpen } from 'lucide-react'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <span className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-white">
            <BookOpen className="w-[18px] h-[18px]" />
          </span>
          <span className="font-semibold text-lg text-neutral-900">StudyFlow</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
          {subtitle && <p className="text-sm text-neutral-500 mt-1 mb-6">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
        </div>
      </div>
    </div>
  )
}
