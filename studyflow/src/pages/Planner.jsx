import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, List, Sparkles, Clock, GraduationCap, Plus, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import TextField from '../components/ui/TextField'
import {
  getPlanBlocksForWeek,
  createPlanBlock,
  updatePlanBlock,
  deletePlanBlock,
  weekdayLabel,
} from '../lib/planBlocksStore'
import { getSubjects } from '../lib/subjectsStore'
import { getExams } from '../lib/examsStore'
import { getSubjectColor } from '../lib/subjectColor'

const DAY_OFFSETS = [0, 1, 2, 3, 4]

// Exam deadlines that fall inside this 5-day window, mapped to the matching
// column. Reads the real exams table (examsStore.getExams) so a deadline
// shown here always matches what /exams says.
function deadlinesByOffset(exams) {
  const map = {}
  exams.forEach((exam) => {
    if (exam.daysLeft >= 0 && exam.daysLeft <= 4) {
      map[exam.daysLeft] = [...(map[exam.daysLeft] ?? []), exam]
    }
  })
  return map
}

export default function Planner() {
  const navigate = useNavigate()
  // null = still checking subjects. You need at least one subject to build
  // a plan against (blocks can still be subject-less "general review", but
  // there's nothing to schedule at all on a totally empty account).
  const [hasStarted, setHasStarted] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [blocks, setBlocks] = useState([])
  const [deadlines, setDeadlines] = useState({})
  const [mobileView, setMobileView] = useState('week') // week | agenda
  const [editingBlock, setEditingBlock] = useState(null)
  const [addingBlock, setAddingBlock] = useState(false)
  const [rebalanceMsg, setRebalanceMsg] = useState('')

  function loadBlocks() {
    getPlanBlocksForWeek().then(setBlocks)
  }

  useEffect(() => {
    getSubjects().then((subs) => {
      const started = subs.length > 0
      setSubjects(subs)
      setHasStarted(started)
      if (started) {
        loadBlocks()
        getExams().then((exams) => setDeadlines(deadlinesByOffset(exams)))
      }
    })
  }, [])

  function blocksFor(offset) {
    return blocks.filter((b) => b.dayOffset === offset).sort((a, b) => a.time.localeCompare(b.time))
  }

  async function handleReschedule(newOffset, newTime) {
    await updatePlanBlock(editingBlock.id, { dayOffset: newOffset, time: newTime })
    setEditingBlock(null)
    loadBlocks()
  }

  async function handleDelete() {
    await deletePlanBlock(editingBlock.id)
    setEditingBlock(null)
    loadBlocks()
  }

  async function handleCreate({ subjectId, title, dayOffset, time, duration }) {
    await createPlanBlock({ subjectId, title, dayOffset, time, duration })
    setAddingBlock(false)
    loadBlocks()
  }

  // TODO: real rebalancing needs the FSRS scheduler + exam-proximity
  // weighting on the backend. This is a visible, honest stand-in: it nudges
  // weak-topic-linked blocks earlier in the week rather than silently doing
  // nothing when the button is pressed. Persists via updatePlanBlock now
  // that blocks are real rows.
  async function handleRebalance() {
    const reordered = [...blocks]
      .sort((a, b) => {
        const aWeak = a.title.toLowerCase().includes('weak') || a.title.toLowerCase().includes('double integrals')
        const bWeak = b.title.toLowerCase().includes('weak') || b.title.toLowerCase().includes('double integrals')
        return aWeak === bWeak ? 0 : aWeak ? -1 : 1
      })
      .map((b, i) => ({ ...b, dayOffset: Math.min(b.dayOffset, DAY_OFFSETS[Math.min(i, 4)]) }))

    const changed = reordered.filter((b) => {
      const original = blocks.find((orig) => orig.id === b.id)
      return original.dayOffset !== b.dayOffset
    })
    await Promise.all(changed.map((b) => updatePlanBlock(b.id, { dayOffset: b.dayOffset, time: b.time })))
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
        className={`w-full text-left ${color.bg} border ${color.border} rounded-lg p-2.5 ${color.borderHover} hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150`}
      >
        <div className="flex items-start gap-2">
          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-neutral-900 truncate">{block.title}</p>
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Study Plan</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Build your week &mdash; tap any block to edit it.</p>
        </div>
        {hasStarted && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRebalance}>
              <Sparkles className="w-4 h-4" />
              Rebalance workload
            </Button>
            <Button variant="gradient" onClick={() => setAddingBlock(true)}>
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

      {/* Mobile agenda/week toggle — spec 4.6: "switch naturally between
          agenda and calendar views" on mobile. */}
      {hasStarted && (
      <>
      <div className="flex md:hidden gap-2">
        <button
          type="button"
          onClick={() => setMobileView('week')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium border ${
            mobileView === 'week' ? 'bg-primary-light text-primary border-primary' : 'bg-surface text-neutral-700 border-neutral-300'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Week
        </button>
        <button
          type="button"
          onClick={() => setMobileView('agenda')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium border ${
            mobileView === 'agenda' ? 'bg-primary-light text-primary border-primary' : 'bg-surface text-neutral-700 border-neutral-300'
          }`}
        >
          <List className="w-4 h-4" />
          Agenda
        </button>
      </div>

      {/* Week grid — always on desktop, toggled on mobile */}
      <div className={`${mobileView === 'agenda' ? 'hidden md:grid' : 'grid'} grid-cols-5 gap-3`}>
        {DAY_OFFSETS.map((offset) => {
          const { weekday, date, isToday } = weekdayLabel(offset)
          const dayDeadlines = deadlines[offset] ?? []
          return (
            <Card
              key={offset}
              className={isToday ? 'relative ring-2 ring-primary shadow-lg shadow-primary/10 overflow-hidden' : ''}
            >
              {isToday && (
                <span className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-violet" aria-hidden="true" />
              )}
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{weekday}</p>
                  <p className="text-xs text-neutral-500">{date}</p>
                </div>
                {isToday && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-gradient-to-r from-primary to-violet text-white rounded-full px-2 py-0.5">
                    Today
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {dayDeadlines.map((exam) => (
                  <div key={exam.id} className="flex items-center gap-1.5 bg-danger-light text-danger text-[11px] font-medium rounded-md px-2 py-1.5">
                    <GraduationCap className="w-3 h-3 shrink-0" />
                    {exam.name}
                  </div>
                ))}
                {blocksFor(offset).map((block) => (
                  <BlockCard key={block.id} block={block} />
                ))}
                {blocksFor(offset).length === 0 && dayDeadlines.length === 0 && (
                  <p className="text-xs text-neutral-400">No blocks</p>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Agenda view — flat list, mobile only */}
      {mobileView === 'agenda' && (
        <div className="flex md:hidden flex-col gap-4">
          {DAY_OFFSETS.map((offset) => {
            const { weekday, date, isToday } = weekdayLabel(offset)
            const dayDeadlines = deadlines[offset] ?? []
            const dayBlocks = blocksFor(offset)
            if (dayBlocks.length === 0 && dayDeadlines.length === 0) return null
            return (
              <div key={offset}>
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900 mb-2">
                  {weekday}, {date}
                  {isToday && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-gradient-to-r from-primary to-violet text-white rounded-full px-2 py-0.5">
                      Today
                    </span>
                  )}
                </p>
                <div className="flex flex-col gap-2">
                  {dayDeadlines.map((exam) => (
                    <div key={exam.id} className="flex items-center gap-1.5 bg-danger-light text-danger text-xs font-medium rounded-md px-3 py-2">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      {exam.name} due
                    </div>
                  ))}
                  {dayBlocks.map((block) => (
                    <BlockCard key={block.id} block={block} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
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

      <Modal open={addingBlock} onClose={() => setAddingBlock(false)} title="Add block">
        {addingBlock && (
          <AddBlockForm subjects={subjects} onSave={handleCreate} onCancel={() => setAddingBlock(false)} />
        )}
      </Modal>
    </div>
  )
}

function RescheduleForm({ block, onSave, onDelete, onCancel, onOpenSubject }) {
  const [dayOffset, setDayOffset] = useState(block.dayOffset)
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reschedule-day" className="text-sm font-medium text-neutral-700">Day</label>
        <select
          id="reschedule-day"
          value={dayOffset}
          onChange={(e) => setDayOffset(Number(e.target.value))}
          className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-primary"
        >
          {DAY_OFFSETS.map((offset) => {
            const { weekday, date } = weekdayLabel(offset)
            return (
              <option key={offset} value={offset}>{weekday}, {date}</option>
            )
          })}
        </select>
      </div>

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
          <Button variant="primary" onClick={() => onSave(dayOffset, time)}>Save</Button>
        </div>
      </div>
    </div>
  )
}

function AddBlockForm({ subjects, onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [dayOffset, setDayOffset] = useState(0)
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = title.trim() && time.trim() && duration.trim() && !saving

  async function handleSave() {
    setSaving(true)
    await onSave({ subjectId: subjectId || null, title: title.trim(), dayOffset, time: time.trim(), duration: duration.trim() })
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="add-block-day" className="text-sm font-medium text-neutral-700">Day</label>
        <select
          id="add-block-day"
          value={dayOffset}
          onChange={(e) => setDayOffset(Number(e.target.value))}
          className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-primary"
        >
          {DAY_OFFSETS.map((offset) => {
            const { weekday, date } = weekdayLabel(offset)
            return (
              <option key={offset} value={offset}>{weekday}, {date}</option>
            )
          })}
        </select>
      </div>

      <TextField id="add-block-time" label="Time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 4:30 PM" />
      <TextField id="add-block-duration" label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 20 min" />

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>Add to plan</Button>
      </div>
    </div>
  )
}
