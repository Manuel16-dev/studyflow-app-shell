import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Plus } from 'lucide-react'
import ProgressRing from '../components/ui/ProgressRing'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import { getExams, createExam } from '../lib/examsStore'
import { getSubjects } from '../lib/subjectsStore'

function readinessColor(readiness) {
  if (readiness >= 75) return 'text-secondary'
  if (readiness >= 55) return 'text-accent'
  return 'text-danger'
}

export default function Exams() {
  const navigate = useNavigate()
  const [exams, setExams] = useState(null) // null = loading
  const [subjects, setSubjects] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ subjectId: '', name: '', examDate: '' })
  const [saving, setSaving] = useState(false)

  function refresh() {
    getExams().then(setExams)
  }

  useEffect(() => {
    refresh()
    getSubjects().then(setSubjects)
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.subjectId || !form.name.trim() || !form.examDate) return
    setSaving(true)
    try {
      const updated = await createExam(form)
      setExams(updated)
      setAddOpen(false)
      setForm({ subjectId: '', name: '', examDate: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Exams</h1>
          <p className="text-sm text-neutral-500 mt-0.5">How ready you are, by exam — not just how much time is left.</p>
        </div>
        {subjects.length > 0 && (
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Add exam
          </Button>
        )}
      </div>

      {exams === null ? null : subjects.length === 0 ? (
        <div className="bg-surface border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
          Add a subject first, then you can add an exam for it.
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-surface border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
          No upcoming exams. Add one to start tracking readiness.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exams.map((exam) => (
            <button
              key={exam.id}
              type="button"
              onClick={() => navigate(`/exams/${exam.id}`)}
              className="text-left bg-surface border border-neutral-200 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">{exam.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{exam.subjectName}</p>
                <p className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {exam.daysLeft} day{exam.daysLeft === 1 ? '' : 's'} left
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium ${readinessColor(exam.readiness)}`}>
                  {exam.readiness >= 75 ? 'On track' : exam.readiness >= 55 ? 'Needs work' : 'At risk'}
                </span>
                <ProgressRing value={exam.readiness} size={52} strokeWidth={5} />
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add exam">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="exam-subject" className="text-sm font-medium text-neutral-700">
              Subject
            </label>
            <select
              id="exam-subject"
              value={form.subjectId}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="" disabled>
                Select a subject
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <TextField
            id="exam-name"
            label="Exam name"
            placeholder="e.g. Calculus Midterm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <TextField
            id="exam-date"
            label="Exam date"
            type="date"
            value={form.examDate}
            onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
            required
          />
          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Adding…' : 'Add exam'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
