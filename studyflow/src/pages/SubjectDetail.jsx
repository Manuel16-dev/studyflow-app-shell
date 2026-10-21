import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Sparkles, Trash2, Tags } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CardFormModal from '../components/cards/CardFormModal'
import CardListItem from '../components/cards/CardListItem'
import TopicManager from '../components/topics/TopicManager'
import { getSubject, deleteSubject, getSubjectMastery } from '../lib/subjectsStore'
import { getCards, addCard, updateCard, deleteCard, nextCardId } from '../lib/cardsStore'
import { getTopics, getTopicStats, buildTopicTree, topicIdsWithChildren, topicLabel } from '../lib/topicsStore'
import { tagCounts } from '../lib/tags'
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
  const [mastery, setMastery] = useState(null)
  const [topics, setTopics] = useState([])
  const [topicStats, setTopicStats] = useState({})
  const [activeTopic, setActiveTopic] = useState('all') // 'all' | 'none' | topic id
  const [topicsOpen, setTopicsOpen] = useState(false)

  useEffect(() => {
    getSubject(id).then((s) => setSubject(s ?? null))
    getCards(id).then(setCards)
    getTopics(id).then(setTopics)
    // Live FSRS mastery, replacing the static subjects.mastery column.
    getSubjectMastery().then((m) => setMastery(m[id] ?? 0))
    setActiveTopic('all')
  }, [id])

  // Per-topic counts and mastery. Refreshes whenever the cards or the topic
  // list change (cards edited, topics added, renamed or deleted).
  useEffect(() => {
    getTopicStats(id, topics).then(setTopicStats)
  }, [id, topics, cards])

  // If the active topic was deleted, fall back to showing everything.
  useEffect(() => {
    if (activeTopic !== 'all' && activeTopic !== 'none' && !topics.some((t) => t.id === activeTopic)) {
      setActiveTopic('all')
    }
  }, [topics, activeTopic])

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

  async function handleSave({ front, back, tags, topicId }) {
    if (editingCard) {
      setCards(await updateCard(id, editingCard.id, { front, back, tags, topic_id: topicId }))
    } else {
      setCards(await addCard(id, { id: nextCardId(), front, back, tags, topicId }))
    }
    setFormOpen(false)
    setEditingCard(null)
  }

  async function handleToggleSuspend(card) {
    setCards(await updateCard(id, card.id, { suspended: !card.suspended }))
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

  const tree = buildTopicTree(topics)
  const activeRoot = tree.find((t) => t.id === activeTopic || t.children.some((c) => c.id === activeTopic))
  const visibleIds =
    activeTopic === 'all' || activeTopic === 'none' ? null : topicIdsWithChildren(topics, activeTopic)
  const visibleCards = cards.filter((c) => {
    if (activeTopic === 'all') return true
    if (activeTopic === 'none') return !c.topic_id
    return visibleIds.has(c.topic_id)
  })
  const activeStats = topicStats[activeTopic]
  const activeName = activeTopic === 'none' ? 'No topic' : topics.find((t) => t.id === activeTopic)?.name

  function chip(key, label, count, selected, onClick) {
    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={[
          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
          selected
            ? 'border-primary bg-primary-light text-primary-text'
            : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50',
        ].join(' ')}
      >
        {label}
        {count != null && <span className="ml-1 text-neutral-500">{count}</span>}
      </button>
    )
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
              {cards.length} card{cards.length === 1 ? '' : 's'} &middot; {mastery ?? 0}% mastery
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
            className="p-2.5 rounded-md text-neutral-400 hover:bg-danger-light hover:text-danger-text border border-neutral-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(topics.length > 0 || cards.length > 0) && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {topics.length > 0 && (
              <>
                {chip('all', 'All', cards.length, activeTopic === 'all', () => setActiveTopic('all'))}
                {tree.map((t) =>
                  chip(t.id, t.name, topicStats[t.id]?.cardCount, activeRoot?.id === t.id && activeTopic === t.id, () =>
                    setActiveTopic(t.id)
                  )
                )}
                {topicStats.none?.cardCount > 0 &&
                  chip('none', 'No topic', topicStats.none.cardCount, activeTopic === 'none', () => setActiveTopic('none'))}
              </>
            )}
            <button
              type="button"
              onClick={() => setTopicsOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              <Tags className="w-3.5 h-3.5" />
              {topics.length > 0 ? 'Manage topics' : 'Add topics'}
            </button>
          </div>

          {activeRoot && activeRoot.children.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pl-3 border-l-2 border-neutral-200">
              {chip('root-' + activeRoot.id, 'All ' + activeRoot.name, null, activeTopic === activeRoot.id, () =>
                setActiveTopic(activeRoot.id)
              )}
              {activeRoot.children.map((c) =>
                chip(c.id, c.name, topicStats[c.id]?.cardCount, activeTopic === c.id, () => setActiveTopic(c.id))
              )}
            </div>
          )}

          {activeStats && activeName && (
            <p className="text-xs text-neutral-500">
              {activeName}: {activeStats.cardCount} card{activeStats.cardCount === 1 ? '' : 's'}
              {activeStats.mastery != null && <> &middot; {activeStats.mastery}% mastery</>}
            </p>
          )}
        </div>
      )}

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
          {visibleCards.length === 0 && (
            <p className="text-sm text-neutral-500 py-6 text-center">No cards in this topic yet.</p>
          )}
          {visibleCards.map((card) => (
            <CardListItem
              key={card.id}
              card={card}
              topicLabel={card.topic_id ? topicLabel(topics, card.topic_id) : null}
              onEdit={openEditForm}
              onDelete={setPendingDelete}
              onToggleSuspend={handleToggleSuspend}
            />
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
        tagSuggestions={tagCounts(cards).map(([t]) => t)}
        topics={topics}
        initialTopicId={activeTopic !== 'all' && activeTopic !== 'none' ? activeTopic : ''}
      />

      <TopicManager
        open={topicsOpen}
        onClose={() => setTopicsOpen(false)}
        subjectId={id}
        topics={topics}
        onChange={(next) => {
          setTopics(next)
          // Deleting a topic nulls topic_id on its cards in the database;
          // re-read so the list and badges match.
          getCards(id).then(setCards)
        }}
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
