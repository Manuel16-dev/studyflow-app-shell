import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Sparkles, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CardFormModal from '../components/cards/CardFormModal'
import CardListItem from '../components/cards/CardListItem'
import { getSubject, deleteSubject } from '../lib/subjectsStore'
import { getCards, addCard, updateCard, deleteCard, nextCardId } from '../lib/cardsStore'
import { resolveIcon } from '../lib/iconMap'

export default function SubjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(undefined) // undefined = loading, null = not found
  const [cards, setCards] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteSubjectOpen, setDeleteSubjectOpen] = useState(false)
  const [deletingSubject, setDeletingSubject] = useState(false)

  useEffect(() => {
    getSubject(id).then((s) => setSubject(s ?? null))
    getCards(id).then(setCards)
  }, [id])

  if (subject === undefined) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <p className="text-neutral-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <p className="text-neutral-500">Subject not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/subjects')}>
          Back to Subjects
        </Button>
      </div>
    )
  }

  const Icon = resolveIcon(subject.icon)

  function openAddForm() {
    setEditingCard(null)
    setFormOpen(true)
  }

  function openEditForm(card) {
    setEditingCard(card)
    setFormOpen(true)
  }

  async function handleSave({ front, back }) {
    if (editingCard) {
      setCards(await updateCard(id, editingCard.id, { front, back }))
    } else {
      setCards(await addCard(id, { id: nextCardId(), front, back }))
    }
    setFormOpen(false)
    setEditingCard(null)
  }

  async function confirmDelete() {
    setCards(await deleteCard(id, pendingDelete.id))
    setPendingDelete(null)
  }

  async function confirmDeleteSubject() {
    setDeletingSubject(true)
    try {
      await deleteSubject(id)
      navigate('/subjects')
    } catch {
      setDeletingSubject(false)
      setDeleteSubjectOpen(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/subjects')}
        className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 -ml-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Subjects
      </button>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-md bg-primary text-white">
            <Icon className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">{subject.name}</h1>
            <p className="text-sm text-neutral-500">
              {cards.length} card{cards.length === 1 ? '' : 's'} &middot; {subject.mastery}% mastery
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {cards.length > 0 && (
            <>
              <Button variant="secondary" onClick={() => navigate(`/subjects/${id}/generate`)}>
                <Sparkles className="w-4 h-4" />
                Generate
              </Button>
              <Button variant="primary" onClick={openAddForm}>
                <Plus className="w-4 h-4" />
                Add card
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => setDeleteSubjectOpen(true)}
            aria-label={`Delete subject: ${subject.name}`}
            className="p-2.5 rounded-md text-neutral-400 hover:bg-danger-light hover:text-danger border border-neutral-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="bg-surface border border-dashed border-neutral-300 rounded-lg p-10 text-center flex flex-col items-center gap-4">
          <p className="text-neutral-500">This subject has no cards yet.</p>
          <div className="flex gap-2">
            <Button variant="primary" onClick={openAddForm}>
              <Plus className="w-4 h-4" />
              Add cards
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/subjects/${id}/generate`)}>
              <Sparkles className="w-4 h-4" />
              Generate from material
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((card) => (
            <CardListItem key={card.id} card={card} onEdit={openEditForm} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      <Button variant="primary" className="self-start" onClick={() => navigate('/review')}>
        Start Review
      </Button>

      <CardFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingCard(null)
        }}
        onSave={handleSave}
        initialCard={editingCard}
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

      <Modal open={deleteSubjectOpen} onClose={() => setDeleteSubjectOpen(false)} title={`Delete ${subject.name}?`}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            This permanently deletes <strong>{subject.name}</strong> along with all {cards.length} card
            {cards.length === 1 ? '' : 's'}, its review history, any uploaded materials, and any exams linked to it.
            This can&rsquo;t be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteSubjectOpen(false)} disabled={deletingSubject}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteSubject} disabled={deletingSubject}>
              {deletingSubject ? 'Deleting…' : 'Delete subject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}