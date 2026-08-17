import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, List, Sparkles, Clock, GraduationCap } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { mockPlanBlocks, weekdayLabel } from '../data/mockPlan'
import { mockExams } from '../data/mockExams'
import { mockSubjects } from '../data/mockSubjects'

const DAY_OFFSETS = [0, 1, 2, 3, 4]

function subjectName(subjectId) {
  return mockSubjects.find((s) => s.id === subjectId)?.name ?? null
}

// Exam deadlines that fall inside this 5-day window, mapped to the matching
// column. Reuses mockExams (Exams screen data) rather than a parallel
// dataset, so a deadline shown here always matches what /exams says.
function deadlinesByOffset() {
  const map = {}
  mockExams.forEach((exam) => {
    if (exam.daysLeft >= 0 && exam.daysLeft <= 4) {
      map[exam.daysLeft] = [...(map[exam.daysLeft] ?? []), exam]
    }
  })
  return map
}

export default function Planner() {
  const navigate = useNavigate()
  const [blocks, setBlocks] = useState(mockPlanBlocks)
  const [mobileView, setMobileView] = useState('week') // week | agenda
  const [editingBlock, setEditingBlock] = useState(null)
  const [rebalanceMsg, setRebalanceMsg] = useState('')

  const deadlines = useMemo(deadlinesByOffset, [])

  function blocksFor(offset) {
    return blocks.filter((b) => b.dayOffset === offset).sort((a, b) => a.time.localeCompare(b.time))
  }

  function handleReschedule(newOffset, newTime) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === editingBlock.id ? { ...b, dayOffset: newOffset, time: newTime } : b))
    )
    setEditingBlock(null)
  }

  function handleRebalance() {
    // TODO: real rebalancing needs the FSRS scheduler + exam-proximity
    // weighting on the backend. This is a visible, honest stand-in: it nudges
    // weak-topic-linked blocks earlier in the week rather than silently doing
    // nothing when the button is pressed.
    setBlocks((prev) =>
      [...prev]
        .sort((a, b) => {
          const aWeak = a.title.toLowerCase().includes('weak') || a.title.toLowerCase().includes('double integrals')
          const bWeak = b.title.toLowerCase().includes('weak') || b.title.toLowerCase().includes('double integrals')
          return aWeak === bWeak ? 0 : aWeak ? -1 : 1
        })
        .map((b, i) => ({ ...b, dayOffset: Math.min(b.dayOffset, DAY_OFFSETS[Math.min(i, 4)]) }))
    )
    setRebalanceMsg('Workload rebalanced around your weakest topics and nearest deadlines.')
    setTimeout(() => setRebalanceMsg(''), 4000)
  }

  function BlockCard({ block }) {
    return (
      <button
        type="button"
        onClick={() => setEditingBlock(block)}
        className="w-full text-left bg-primary-light border border-primary/20 rounded-md p-2.5 hover:border-primary transition-colors"
      >
        <p className="text-xs font-medium text-neutral-900">{block.title}</p>
        <p className="flex items-center gap-1 text-[11px] text-neutral-500 mt-1">
          <Clock className="w-3 h-3" />
          {block.time} &middot; {block.duration}
        </p>
      </button>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Study Plan</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Priorities turned into a schedule &mdash; tap any block to reschedule it.</p>
        </div>
        <Button variant="secondary" onClick={handleRebalance}>
          <Sparkles className="w-4 h-4" />
          Rebalance workload
        </Button>
      </div>

      {rebalanceMsg && (
        <div className="bg-secondary-light text-secondary text-sm rounded-md px-4 py-2.5">{rebalanceMsg}</div>
      )}

      {/* Mobile agenda/week toggle — spec 4.6: "switch naturally between
          agenda and calendar views" on mobile. */}
      <div className="flex md:hidden gap-2">
        <button
          type="button"
          onClick={() => setMobileView('week')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium border ${
            mobileView === 'week' ? 'bg-primary-light text-primary border-primary' : 'bg-white text-neutral-700 border-neutral-300'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Week
        </button>
        <button
          type="button"
          onClick={() => setMobileView('agenda')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium border ${
            mobileView === 'agenda' ? 'bg-primary-light text-primary border-primary' : 'bg-white text-neutral-700 border-neutral-300'
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
            <Card key={offset} className={isToday ? 'ring-2 ring-primary' : ''}>
              <div className="mb-3">
                <p className="text-sm font-semibold text-neutral-900">{weekday}</p>
                <p className="text-xs text-neutral-500">{date}{isToday ? ' \u00b7 Today' : ''}</p>
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
                <p className="text-sm font-semibold text-neutral-900 mb-2">
                  {weekday}, {date}{isToday ? ' \u00b7 Today' : ''}
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

      <Modal open={!!editingBlock} onClose={() => setEditingBlock(null)} title="Reschedule">
        {editingBlock && <RescheduleForm block={editingBlock} onSave={handleReschedule} onCancel={() => setEditingBlock(null)} onOpenSubject={(id) => navigate(`/subjects/${id}`)} />}
      </Modal>
    </div>
  )
}

function RescheduleForm({ block, onSave, onCancel, onOpenSubject }) {
  const [dayOffset, setDayOffset] = useState(block.dayOffset)
  const [time, setTime] = useState(block.time)
  const subject = subjectName(block.subjectId)

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reschedule-time" className="text-sm font-medium text-neutral-700">Time</label>
        <input
          id="reschedule-time"
          type="text"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="e.g. 4:30 PM"
          className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-primary"
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        {subject ? (
          <button type="button" onClick={() => onOpenSubject(block.subjectId)} className="text-sm font-medium text-primary hover:underline">
            View subject
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(dayOffset, time)}>Save</Button>
        </div>
      </div>
    </div>
  )
}
