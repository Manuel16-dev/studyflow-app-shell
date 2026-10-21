import { useEffect, useMemo, useState } from 'react'
import { Plus, Layers, Search } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CardFormModal from '../components/cards/CardFormModal'
import CardListItem from '../components/cards/CardListItem'
import { getSubjects } from '../lib/subjectsStore'
import { getAllCards, addCard, updateCard, deleteCard, nextCardId } from '../lib/cardsStore'
import { tagCounts } from '../lib/tags'

// Global card browse/manage screen — every card across every subject, one
// place. Real data only: getAllCards() (all subjects, joined) and
// getSubjects() (for the filter + the add-card subject picker). No mock
// data, unlike the old PlaceholderPage this replaces.
export default function Flashcards() {
  const [subjects, setSubjects] = useState([])
  const [cards, setCards] = useState(null) // null = loading
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState([]) // cards must have ALL of these
  const [formOpen, setFormOpen] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  function refresh() {
    getAllCards().then(setCards)
  }

  useEffect(() => {
    refresh()
    getSubjects().then(setSubjects)
  }, [])

  const filteredCards = useMemo(() => {
    if (!cards) return []
    const q = query.trim().toLowerCase()
    return cards.filter(
      (c) =>
        (subjectFilter === 'all' || c.subjectId === subjectFilter) &&
        activeTags.every((t) => c.tags?.includes(t)) &&
        (!q || c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q))
    )
  }, [cards, subjectFilter, query, activeTags])

  // Tags offered as filter chips come from the cards in the chosen subject,
  // so a chip never leads to an empty list.
  const allTags = useMemo(
    () => tagCounts((cards ?? []).filter((c) => subjectFilter === 'all' || c.subjectId === subjectFilter)),
    [cards, subjectFilter]
  )
  const filtersActive = query.trim() !== '' || activeTags.length > 0

  function toggleTag(tag) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function openAddForm() {
    setEditingCard(null)
    setFormOpen(true)
  }

  function openEditForm(card) {
    setEditingCard(card)
    setFormOpen(true)
  }

  async function handleToggleSuspend(card) {
    await updateCard(card.subjectId, card.id, { suspended: !card.suspended })
    refresh()
  }

  async function handleSave({ front, back, subjectId, tags }) {
    if (editingCard) {
      await updateCard(editingCard.subjectId, editingCard.id, { front, back, tags })
    } else {
      await addCard(subjectId, { id: nextCardId(), front, back, tags })
    }
    refresh()
    setFormOpen(false)
    setEditingCard(null)
  }

  async function confirmDelete() {
    await deleteCard(pendingDelete.subjectId, pendingDelete.id)
    refresh()
    setPendingDelete(null)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Flashcards</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Every card, across every subject.</p>
        </div>
        {subjects.length > 0 && (
          <Button variant="primary" onClick={openAddForm}>
            <Plus className="w-4 h-4" />
            Add card
          </Button>
        )}
      </div>

      {cards !== null && cards.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions and answers"
              aria-label="Search cards"
              className="w-full rounded-md border border-neutral-300 bg-surface pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
          {subjects.length > 1 && (
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value)
                setActiveTags([])
              }}
              aria-label="Filter by subject"
              className="rounded-md border border-neutral-300 bg-surface px-3 py-2 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="all">All subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
          {allTags.map(([tag, n]) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={activeTags.includes(tag)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:outline-primary',
                activeTags.includes(tag)
                  ? 'border-primary bg-primary-light text-primary-text'
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50',
              ].join(' ')}
            >
              #{tag} <span className="text-neutral-500">{n}</span>
            </button>
          ))}
        </div>
      )}

      {cards === null ? null : subjects.length === 0 ? (
        <div className="bg-surface border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
          Add a subject first, then you can add cards to it.
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-surface border border-dashed border-neutral-300 rounded-lg p-10 text-center flex flex-col items-center gap-4">
          <Layers className="w-8 h-8 text-neutral-300" />
          <p className="text-neutral-500">
            {filtersActive
              ? 'No cards match your search or tags.'
              : subjectFilter === 'all'
                ? 'No cards yet.'
                : 'No cards in this subject yet.'}
          </p>
          {filtersActive ? (
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('')
                setActiveTags([])
              }}
            >
              Clear filters
            </Button>
          ) : (
            <Button variant="primary" onClick={openAddForm}>
              <Plus className="w-4 h-4" />
              Add a card
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredCards.map((card) => (
            <CardListItem
              key={card.id}
              card={card}
              subjectLabel={subjectFilter === 'all' ? card.subjectName : undefined}
              onEdit={openEditForm}
              onDelete={setPendingDelete}
              onToggleSuspend={handleToggleSuspend}
            />
          ))}
        </div>
      )}

      <CardFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingCard(null)
        }}
        onSave={handleSave}
        initialCard={editingCard}
        subjects={subjects}
        initialSubjectId={subjectFilter !== 'all' ? subjectFilter : undefined}
        tagSuggestions={tagCounts(cards ?? []).map(([t]) => t)}
      />

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete this card?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            This permanently deletes &ldquo;{pendingDelete?.front}&rdquo; and its review history. This can&rsquo;t be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete card
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
