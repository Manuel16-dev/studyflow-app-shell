import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles, Clock, GraduationCap, Plus, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import TextField from '../components/ui/TextField'
import {
  getPlanBlocksForMonth,
  createPlanBlock,
  updatePlanBlock,
  deletePlanBlock,
} from '../lib/planBlocksStore'
import { getSubjects } from '../lib/subjectsStore'
import { getExams } from '../lib/examsStore'
import { getSubjectColor } from '../lib/subjectColor'

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function todayDateStr() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Builds the 7-wide grid of cells for a month view, including dimmed
// leading/trailing days from the adjacent months so every row is a full
// week (matches the reference calendar layout).
function buildMonthGrid(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, dateStr: toDateStr(year, month, d) })
  }
  let nextDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, current: false })
  }
  return cells
}

function agendaLabel(dateStr) {
  const today = todayDateStr()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Planner() {
  const navigate = useNavigate()
  // null = still checking subjects. You need at least one subject to build
  // a plan against (blocks can still be subject-less "general review", but
  // there's nothing to schedule at all on a totally empty account).
  const [hasStarted, setHasStarted] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [blocks, setBlocks] = useState([])
  const [exams, setExams] = useState([])
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [editingBlock, setEditingBlock] = useState(null)
  const [addingForDate, setAddingForDate] = useState(null) // dateStr | null
  const [rebalanceMsg, setRebalanceMsg] = useState('')

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const today = todayDateStr()
  const isCurrentMonthView = year === new Date().getFullYear() && month === new Date().getMonth()

  function loadBlocks() {
    getPlanBlocksForMonth(year, month).then(setBlocks)
  }

  useEffect(() => {
    getSubjects().then((subs) => {
      const started = subs.length > 0
      setSubjects(subs)
      setHasStarted(started)
      if (started) {
        getExams().then(setExams)
      }
    })
  }, [])

  useEffect(() => {
    if (hasStarted) loadBlocks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, year, month])

  // Map of dateStr -> { blocks: [...], exams: [...] } for dot rendering on
  // the grid and section grouping in the agenda below it.
  const itemsByDate = useMemo(() => {
    const map = {}
    blocks.forEach((b) => {
      if (!map[b.blockDate]) map[b.blockDate] = { blocks: [], exams: [] }
      map[b.blockDate].blocks.push(b)
    })
    exams.forEach((e) => {
      const d = e.examDate.slice(0, 10)
      const d2 = new Date(`${d}T00:00:00`)
      if (d2.getFullYear() === year && d2.getMonth() === month) {
        if (!map[d]) map[d] = { blocks: [], exams: [] }
        map[d].exams.push(e)
      }
    })
    return map
  }, [blocks, exams, year, month])

  const agendaDates = Object.keys(itemsByDate).sort()
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])

  function scrollToAgenda(dateStr) {
    const el = document.getElementById(`agenda-${dateStr}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleDayClick(cell) {
    if (!cell.current) return
    if (itemsByDate[cell.dateStr]) {
      scrollToAgenda(cell.dateStr)
    } else {
      setAddingForDate(cell.dateStr)
    }
  }

  async function handleReschedule(blockDate, time) {
    await updatePlanBlock(editingBlock.id, { blockDate, time })
    setEditingBlock(null)
    loadBlocks()
  }

  async function handleDelete() {
    await deletePlanBlock(editingBlock.id)
    setEditingBlock(null)
    loadBlocks()
  }

  async function handleCreate({ subjectId, title, blockDate, time, duration }) {
    await createPlanBlock({ subjectId, title, blockDate, time, duration })
    setAddingForDate(null)
    loadBlocks()
  }

  // Honest, visible stand-in until the FSRS scheduler + exam-proximity
  // weighting lands on the backend: nudges weak-topic-linked blocks earlier
  // within the next 5 days. Scoped to the current month view only — moving
  // blocks in a month you're not looking at would be confusing, so the
  // button is hidden entirely when monthCursor isn't the present month.
  async function handleRebalance() {
    const nearTerm = blocks.filter((b) => b.dayOffset >= 0 && b.dayOffset <= 4)
    const reordered = [...nearTerm]
      .sort((a, b) => {
        const aWeak = a.title.toLowerCase().includes('weak') || a.title.toLowerCase().includes('double integrals')
        const bWeak = b.title.toLowerCase().includes('weak') || b.title.toLowerCase().includes('double integrals')
        return aWeak === bWeak ? 0 : aWeak ? -1 : 1
      })
      .map((b, i) => {
        const targetOffset = Math.min(b.dayOffset, i)
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() + targetOffset)
        return { ...b, blockDate: d.toISOString().slice(0, 10) }
      })

    const changed = reordered.filter((b) => {
      const original = nearTerm.find((orig) => orig.id === b.id)
      return original.blockDate !== b.blockDate
    })
    await Promise.all(changed.map((b) => updatePlanBlock(b.id, { blockDate: b.blockDate, time: b.time })))
    loadBlocks()
    setRebalanceMsg('Workload rebalanced around your weakest topics and nearest deadlines.')
    setTimeout(() => setRebalanceMsg(''), 4000)
  }

  function BlockCard({ block }) {
    const color = getSubjectColor(block.subjectId)
    return (
      <button
        type="button"
        onClick={() => setEditingBlock(block)}
        className={`w-full text-left ${color.chipBg} ${color.accentBorder} rounded-lg p-2.5 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150`}
      >
        <div className="flex items-start gap-2">
          <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${color.dot}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-neutral-900 truncate">{block.title}</p>
            <p className="flex items-center gap-1 text-[11px] text-neutral-500 mt-1">
              <Clock className="w-3 h-3 shrink-0" />
              {block.time} &middot; {block.duration}
            </p>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Study Plan</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Tap a date to add or review a block.</p>
        </div>
        {hasStarted && (
          <div className="flex gap-2">
            {isCurrentMonthView && (
              <Button variant="secondary" onClick={handleRebalance}>
                <Sparkles className="w-4 h-4" />
                Rebalance workload
              </Button>
            )}
            <Button variant="gradient" onClick={() => setAddingForDate(today)}>
              <Plus className="w-4 h-4" />
              Add block
            </Button>
          </div>
        )}
      </div>

      {rebalanceMsg && (
        <div className="bg-secondary-light text-secondary text-sm rounded-md px-4 py-2.5">{rebalanceMsg}</div>
      )}

      {hasStarted === false && (
        <Card className="text-center py-10">
          <CalendarDays className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-900">No study plan yet</p>
          <p className="text-sm text-neutral-500 mt-1 mb-4">Add a subject to start building your schedule.</p>
          <Button variant="primary" onClick={() => navigate('/subjects')}>
            <Plus className="w-4 h-4" />
            Add a subject
          </Button>
        </Card>
      )}

      {hasStarted && (
        <>
          {/* Month grid */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-sm font-semibold text-neutral-900">
                {monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
              <button
                type="button"
                onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-2 text-center">
              {WEEKDAY_HEADERS.map((wd) => (
                <p key={wd} className="text-[11px] font-medium text-neutral-500">{wd}</p>
              ))}
              {grid.map((cell, i) => {
                const isToday = cell.current && cell.dateStr === today
                const dayItems = cell.current ? itemsByDate[cell.dateStr] : null
                const dots = dayItems ? dayItems.blocks.slice(0, 3) : []
                const hasExam = dayItems && dayItems.exams.length > 0
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDayClick(cell)}
                    disabled={!cell.current}
                    className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors ${
                      cell.current ? 'hover:bg-neutral-100 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                        !cell.current
                          ? 'text-neutral-300'
                          : isToday
                          ? 'bg-gradient-to-br from-primary to-violet text-white font-semibold'
                          : 'text-neutral-900'
                      }`}
                    >
                      {cell.day}
                    </span>
                    <span className="flex items-center gap-0.5 h-1.5">
                      {dots.map((b) => (
                        <span key={b.id} className={`w-1.5 h-1.5 rounded-full ${getSubjectColor(b.subjectId).dot}`} />
                      ))}
                      {hasExam && <span className="w-1.5 h-1.5 rounded-full bg-danger" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Agenda — every date in the displayed month that has a block or exam */}
          <div className="flex flex-col gap-4">
            {agendaDates.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-6">Nothing scheduled this month yet &mdash; tap a date above to add a block.</p>
            )}
            {agendaDates.map((dateStr) => {
              const { blocks: dayBlocks, exams: dayExams } = itemsByDate[dateStr]
              return (
                <div key={dateStr} id={`agenda-${dateStr}`}>
                  <p className="text-sm font-semibold text-neutral-900 mb-2">{agendaLabel(dateStr)}</p>
                  <div className="flex flex-col gap-2">
                    {dayExams.map((exam) => (
                      <div key={exam.id} className="flex items-center gap-1.5 bg-danger-light text-danger text-xs font-medium rounded-md px-3 py-2">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                        {exam.name} due
                      </div>
                    ))}
                    {dayBlocks
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((block) => (
                        <BlockCard key={block.id} block={block} />
                      ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <Modal open={!!editingBlock} onClose={() => setEditingBlock(null)} title="Edit block">
        {editingBlock && (
          <RescheduleForm
            block={editingBlock}
            onSave={handleReschedule}
            onDelete={handleDelete}
            onCancel={() => setEditingBlock(null)}
            onOpenSubject={(id) => navigate(`/subjects/${id}`)}
          />
        )}
      </Modal>

      <Modal open={!!addingForDate} onClose={() => setAddingForDate(null)} title="Add block">
        {addingForDate && (
          <AddBlockForm
            subjects={subjects}
            defaultDate={addingForDate}
            onSave={handleCreate}
            onCancel={() => setAddingForDate(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function RescheduleForm({ block, onSave, onDelete, onCancel, onOpenSubject }) {
  const [blockDate, setBlockDate] = useState(block.blockDate)
  const [time, setTime] = useState(block.time)
  const [subject, setSubject] = useState(null)

  useEffect(() => {
    getSubjects().then((subjects) => {
      setSubject(subjects.find((s) => s.id === block.subjectId)?.name ?? null)
    })
  }, [block.subjectId])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-neutral-900">{block.title}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{block.duration}{subject ? ` \u00b7 ${subject}` : ''}</p>
      </div>

      <TextField
        id="reschedule-date"
        label="Date"
        type="date"
        value={blockDate}
        onChange={(e) => setBlockDate(e.target.value)}
      />

      <TextField
        id="reschedule-time"
        label="Time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        placeholder="e.g. 4:30 PM"
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onDelete}
          className="p-2 -ml-2 rounded-md text-neutral-400 hover:text-danger hover:bg-danger-light"
          aria-label="Delete block"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          {subject && (
            <button type="button" onClick={() => onOpenSubject(block.subjectId)} className="text-sm font-medium text-primary hover:underline">
              View subject
            </button>
          )}
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(blockDate, time)}>Save</Button>
        </div>
      </div>
    </div>
  )
}

function AddBlockForm({ subjects, defaultDate, onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [blockDate, setBlockDate] = useState(defaultDate)
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSave = title.trim() && time.trim() && duration.trim() && blockDate && !saving

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await onSave({ subjectId: subjectId || null, title: title.trim(), blockDate, time: time.trim(), duration: duration.trim() })
    } catch (err) {
      setError(err.message || 'Could not save this block. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField
        id="add-block-title"
        label="What are you studying?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Chapter 4 Review"
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="add-block-subject" className="text-sm font-medium text-neutral-700">Subject (optional)</label>
        <select
          id="add-block-subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-primary"
        >
          <option value="">General &mdash; no subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <TextField
        id="add-block-date"
        label="Date"
        type="date"
        value={blockDate}
        onChange={(e) => setBlockDate(e.target.value)}
      />
      <TextField id="add-block-time" label="Time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 4:30 PM" />
      <TextField id="add-block-duration" label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 20 min" />
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>{saving ? 'Adding\u2026' : 'Add to plan'}</Button>
      </div>
    </div>
  )
}
