import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Trash2, Sparkles, Library as LibraryIcon } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { getSubjects } from '../lib/subjectsStore'
import { getAllMaterialsWithCoverage, deleteMaterial } from '../lib/materialsStore'
import { getSubjectColor } from '../lib/subjectColor'

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A to Z' },
  { value: 'uncovered', label: 'Most left to cover' },
]

function coveragePercent(m) {
  return m.totalChunks === 0 ? 0 : Math.round((m.coveredChunks / m.totalChunks) * 100)
}

function sortMaterials(list, sort) {
  const out = [...list]
  if (sort === 'oldest') out.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  else if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort === 'uncovered')
    out.sort((a, b) => b.totalChunks - b.coveredChunks - (a.totalChunks - a.coveredChunks))
  return out // 'newest' is the order the store returns
}

export default function Library() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState(null) // null = loading
  const [subjects, setSubjects] = useState([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getAllMaterialsWithCoverage(), getSubjects()])
      .then(([mats, subs]) => {
        if (cancelled) return
        setMaterials(mats)
        setSubjects(subs)
      })
      .catch(() => {
        if (cancelled) return
        setError("Couldn't load your library. Please try again.")
        setMaterials([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const subjectName = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects])

  // Only offer filter chips for subjects that actually have material.
  const subjectsWithMaterial = useMemo(() => {
    const ids = new Set((materials ?? []).map((m) => m.subjectId))
    return subjects.filter((s) => ids.has(s.id))
  }, [materials, subjects])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = (materials ?? []).filter(
      (m) =>
        (subjectFilter === 'all' || m.subjectId === subjectFilter) &&
        (!q || m.name.toLowerCase().includes(q) || (subjectName[m.subjectId] ?? '').toLowerCase().includes(q))
    )
    return sortMaterials(filtered, sort)
  }, [materials, query, subjectFilter, sort, subjectName])

  const totals = useMemo(() => {
    const list = materials ?? []
    const total = list.reduce((a, m) => a + m.totalChunks, 0)
    const covered = list.reduce((a, m) => a + m.coveredChunks, 0)
    return { count: list.length, percent: total === 0 ? 0 : Math.round((covered / total) * 100) }
  }, [materials])

  async function confirmDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteMaterial(pendingDelete.id, pendingDelete.storagePath)
      setMaterials((list) => list.filter((m) => m.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      setDeleteError(err.message ?? "Couldn't delete this material.")
    } finally {
      setDeleting(false)
    }
  }

  const loading = materials === null

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col gap-4 pb-16">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Library</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          {loading
            ? 'Loading your source material…'
            : totals.count === 0
              ? 'Uploaded source material will appear here.'
              : `${totals.count} material${totals.count === 1 ? '' : 's'} · ${totals.percent}% of sections turned into cards`}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger-text bg-danger-light border border-danger/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {!loading && totals.count === 0 && !error && (
        <Card>
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <LibraryIcon className="w-8 h-8 text-neutral-400" aria-hidden="true" />
            <p className="text-sm font-medium text-neutral-900">No materials yet</p>
            <p className="text-sm text-neutral-500 max-w-sm">
              Open a subject and choose "Generate from material" to upload notes or slides. They'll be kept
              here so you can generate more cards later without uploading again.
            </p>
            <Button variant="primary" className="mt-2" onClick={() => navigate('/subjects')}>
              Go to subjects
            </Button>
          </div>
        </Card>
      )}

      {totals.count > 0 && (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search materials or subjects"
                aria-label="Search materials"
                className="w-full rounded-md border border-neutral-300 bg-surface pl-9 pr-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort materials"
              className="rounded-md border border-neutral-300 bg-surface px-3 py-2.5 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-primary"
            >
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {subjectsWithMaterial.length > 1 && (
            <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by subject">
              {[{ id: 'all', name: 'All subjects' }, ...subjectsWithMaterial].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubjectFilter(s.id)}
                  aria-pressed={subjectFilter === s.id}
                  className={[
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-primary',
                    subjectFilter === s.id
                      ? 'border-primary bg-primary-light text-primary-text'
                      : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50',
                  ].join(' ')}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">No materials match your search.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((m) => {
                const pct = coveragePercent(m)
                const left = m.totalChunks - m.coveredChunks
                return (
                  <li key={m.id}>
                    <Card>
                      <div className="flex items-start gap-3">
                        <span
                          className="flex items-center justify-center w-10 h-10 rounded-md bg-neutral-100 text-neutral-600 shrink-0"
                          aria-hidden="true"
                        >
                          <FileText className="w-5 h-5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-neutral-900 break-words">{m.name}</p>
                            {m.fullyCovered ? (
                              <Badge variant="mastered">Fully covered</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${getSubjectColor(m.subjectId).dot}`} aria-hidden="true" />
                            {subjectName[m.subjectId] ?? 'Unknown subject'} · {m.cardCount} card{m.cardCount === 1 ? '' : 's'} · Added{' '}
                            {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>

                          {m.totalChunks > 0 && (
                            <div className="mt-3">
                              <div
                                className="h-1.5 rounded-full bg-neutral-100 overflow-hidden"
                                role="progressbar"
                                aria-label={`${m.name} coverage`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={pct}
                              >
                                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-xs text-neutral-500 mt-1">
                                {m.coveredChunks} of {m.totalChunks} sections turned into cards
                                {left > 0 ? ` · ${left} left` : ''}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2 mt-3 flex-wrap">
                            <Button
                              variant="secondary"
                              className="!py-1.5"
                              onClick={() => navigate(`/subjects/${m.subjectId}/generate`)}
                            >
                              <Sparkles className="w-4 h-4" />
                              {m.fullyCovered ? 'Generate again' : 'Generate more'}
                            </Button>
                            <Button
                              variant="ghost"
                              className="!py-1.5"
                              onClick={() => {
                                setDeleteError('')
                                setPendingDelete(m)
                              }}
                              aria-label={`Delete ${m.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <Modal open={!!pendingDelete} onClose={() => !deleting && setPendingDelete(null)} title="Delete this material?">
        {pendingDelete && (
          <>
            <p className="text-sm text-neutral-700">
              "{pendingDelete.name}" and its uploaded file will be removed. Cards you already created from it are
              kept.
            </p>
            {deleteError && (
              <p role="alert" className="text-sm text-danger-text mt-3">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setPendingDelete(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
