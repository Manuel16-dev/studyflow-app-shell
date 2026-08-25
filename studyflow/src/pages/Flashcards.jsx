import { useEffect, useMemo, useState } from 'react'
import { Plus, Layers } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CardFormModal from '../components/cards/CardFormModal'
import CardListItem from '../components/cards/CardListItem'
import { getSubjects } from '../lib/subjectsStore'
import { getAllCards, addCard, updateCard, deleteCard, nextCardId } from '../lib/cardsStore'

// Global card browse/manage screen — every card across every subject, one
// place. Real data only: getAllCards() (all subjects, joined) and
// getSubjects() (for the filter + the add-card subject picker). No mock
// data, unlike the old PlaceholderPage this replaces.
export default function Flashcards() {
  const [subjects, setSubjects] = useState([])
  const [cards, setCards] = useState(null) // null = loading
  const [subjectFilter, setSubjectFilter] = useState('all')
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
    return subjectFilter === 'all' ? cards : cards.filter((c) => c.subjectId === subjectFilter)
  }, [cards, subjectFilter])

  function openAddForm() {
    setEditingCard(null)
    setFormOpen(true)
  }

  function openEditForm(card) {
    setEditingCard(card)
    setFormOpen(true)
  }

  async function handleSave({ front, back, subjectId }) {
    if (editingCard) {
      await updateCard(editingCard.subjectId, editingCard.id, { front, back })
    } else {
      await addCard(subjectId, { id: nextCardId(), front, back })
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

      {subjects.length > 1 && (
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="self-start rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <option value="all">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      {cards === null ? null : subjects.length === 0 ? (
        <div className="bg-surface border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
          Add a subject first, then you can add cards to it.
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-surface border border-dashed border-neutral-300 rounded-lg p-10 text-center flex flex-col items-center gap-4">
          <Layers className="w-8 h-8 text-neutral-300" />
          <p className="text-neutral-500">
            {subjectFilter === 'all' ? 'No cards yet.' : 'No cards in this subject yet.'}
          </p>
          <Button variant="primary" onClick={openAddForm}>
            <Plus className="w-4 h-4" />
            Add a card
          </Button>
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
