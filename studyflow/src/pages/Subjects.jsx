import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, MoreVertical, BookOpen } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import TextField from '../components/ui/TextField'
import { mockSubjects, subjectColors } from '../data/mockSubjects'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'weak', label: 'Needs work' },
  { id: 'strong', label: 'Strong' },
]

function matchesFilter(subject, filterId) {
  if (filterId === 'weak') return subject.mastery < 65
  if (filterId === 'strong') return subject.mastery >= 80
  return true
}

function SubjectCard({ subject, onOpen }) {
  const Icon = subject.icon
  const color = subjectColors.find((c) => c.name === subject.color)

  return (
    <button
      type="button"
      onClick={() => onOpen(subject.id)}
      className="text-left bg-white border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`flex items-center justify-center w-9 h-9 rounded-md text-white ${color.bg}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <span className="p-1 -mr-1 -mt-1 rounded-md text-neutral-400 hover:bg-neutral-100" aria-hidden="true">
          <MoreVertical className="w-4 h-4" />
        </span>
      </div>
      <p className="text-sm font-semibold text-neutral-900">{subject.name}</p>
      <p className="text-xs text-neutral-500 mt-0.5">
        {subject.cardCount} cards &middot; {subject.mastery}% mastery
      </p>
      <div className="h-1.5 rounded-full bg-neutral-100 mt-3 overflow-hidden">
        <div className="h-full bg-secondary rounded-full" style={{ width: `${subject.mastery}%` }} />
      </div>
    </button>
  )
}

export default function Subjects() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [subjects, setSubjects] = useState(mockSubjects)
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const filtered = useMemo(() => {
    return subjects.filter(
      (s) => s.name.toLowerCase().includes(query.trim().toLowerCase()) && matchesFilter(s, activeFilter)
    )
  }, [subjects, query, activeFilter])

  function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const id = newName.trim().toLowerCase().replace(/\s+/g, '-')
    setSubjects((prev) => [
      { id, name: newName.trim(), cardCount: 0, mastery: 0, color: 'blue', icon: BookOpen },
      ...prev,
    ])
    setNewName('')
    setModalOpen(false)
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">My Subjects</h1>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          New Subject
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects..."
            aria-label="Search subjects"
            className="w-full rounded-md border border-neutral-300 pl-9 pr-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={[
                'px-3 py-2 rounded-md text-sm font-medium border transition-colors whitespace-nowrap',
                activeFilter === f.id
                  ? 'bg-primary-light text-primary border-primary'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
          No subjects match your search.
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
          {filtered.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} onOpen={(id) => navigate(`/subjects/${id}`)} />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Subject">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <TextField
            id="subject-name"
            label="Subject name"
            placeholder="e.g. Organic Chemistry"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
