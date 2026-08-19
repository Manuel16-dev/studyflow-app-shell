import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, Sparkles, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import FlowTopBar from '../components/ui/FlowTopBar'
import Button from '../components/ui/Button'
import CardFormModal from '../components/cards/CardFormModal'
import { getSubject } from '../lib/subjectsStore'
import { addCards, nextCardId } from '../lib/cardsStore'
import { mockSource, mockGeneratedCards, regenerateOne } from '../data/mockGeneration'

// Screen build order item 7 (AI-generated cards), spec section 4.4 + 8.
// Flow: source -> processing -> review/approve -> done. Cards stay
// "candidates" (not written to the subject's trusted deck) until approved,
// per the spec's trust/approval requirement.
export default function GenerateCards() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(undefined) // undefined = loading, null = not found

  const [step, setStep] = useState('source') // source | processing | error | review | done
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [editingCard, setEditingCard] = useState(null)
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [regenError, setRegenError] = useState(null)

  useEffect(() => {
    getSubject(id).then((s) => setSubject(s ?? null))
  }, [id])

  function startGeneration() {
    setStep('processing')
    setTimeout(() => {
      if (Math.random() < 0.15) {
        setStep('error')
        return
      }
      setCandidates(mockGeneratedCards)
      setSelected(new Set(mockGeneratedCards.map((c) => c.id)))
      setStep('review')
    }, 1400)
  }

  function toggleOne(cardId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === candidates.length ? new Set() : new Set(candidates.map((c) => c.id))))
  }

  function discard(cardId) {
    setCandidates((prev) => prev.filter((c) => c.id !== cardId))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(cardId)
      return next
    })
  }

  async function regenerate(card) {
    setRegeneratingId(card.id)
    setRegenError(null)
    try {
      const updated = await regenerateOne(card)
      setCandidates((prev) => prev.map((c) => (c.id === card.id ? updated : c)))
    } catch {
      setRegenError(card.id)
    } finally {
      setRegeneratingId(null)
    }
  }

  function saveEdit({ front, back }) {
    setCandidates((prev) => prev.map((c) => (c.id === editingCard.id ? { ...c, front, back } : c)))
    setEditingCard(null)
  }

  async function approveSelected() {
    // Writes straight into cardsStore — SubjectDetail reads from the same
    // store, so approved cards actually show up there on return.
    const approved = candidates
      .filter((c) => selected.has(c.id))
      .map((c) => ({ id: nextCardId(), front: c.front, back: c.back }))
    await addCards(id, approved)
    setStep('done')
  }

  if (subject === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Subject not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <FlowTopBar
        title={`Generate cards \u2014 ${subject.name}`}
        onClose={() => navigate(`/subjects/${id}`)}
      />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        {step === 'source' && (
          <div className="w-full max-w-md text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary-light text-primary mx-auto mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">{mockSource.name}</h1>
            <p className="text-sm text-neutral-500 mt-1 mb-6">{mockSource.pages} pages &middot; ready to generate</p>
            <Button variant="primary" className="w-full" onClick={startGeneration}>
              <Sparkles className="w-4 h-4" />
              Generate cards from this material
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="w-full max-w-md text-center">
            <p className="text-sm font-medium text-neutral-900 mb-1">{mockSource.name}</p>
            <p className="text-sm text-neutral-500 mb-6">Generating cards\u2026</p>
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="w-full max-w-md text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-danger-light text-danger mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">Generation failed</h1>
            <p className="text-sm text-neutral-500 mt-1 mb-6">
              {mockSource.name} is still available \u2014 nothing was lost. You can try again.
            </p>
            <Button variant="primary" className="w-full" onClick={startGeneration}>
              Retry
            </Button>
          </div>
        )}

        {step === 'review' && (
          <div className="w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-semibold text-neutral-900">Review generated cards</h1>
                <p className="text-sm text-neutral-500">
                  {selected.size} of {candidates.length} selected \u2014 approve to add them to {subject.name}.
                </p>
              </div>
              {candidates.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-sm font-medium text-primary hover:underline shrink-0"
                >
                  {selected.size === candidates.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {candidates.length === 0 ? (
              <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
                All candidates discarded. Go back and generate again if you'd like another pass.
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-6">
                {candidates.map((card) => (
                  <div key={card.id} className="bg-white border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(card.id)}
                        onChange={() => toggleOne(card.id)}
                        aria-label={`Select card: ${card.front}`}
                        className="mt-1 w-4 h-4 accent-primary shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900">{card.front}</p>
                        <p className="text-sm text-neutral-500 mt-1">{card.back}</p>
                        <span className="inline-block text-xs text-neutral-400 mt-2">Source: {card.sourceRef}</span>

                        {regenError === card.id && (
                          <p className="text-sm text-danger mt-2">
                            Regeneration failed. <button type="button" onClick={() => regenerate(card)} className="underline font-medium">Retry</button>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingCard(card)}
                          className="px-2 py-1.5 rounded-md text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => regenerate(card)}
                          disabled={regeneratingId === card.id}
                          aria-label={`Regenerate card: ${card.front}`}
                          className="p-2 rounded-md text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${regeneratingId === card.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => discard(card.id)}
                          aria-label={`Discard card: ${card.front}`}
                          className="p-2 rounded-md text-neutral-500 hover:bg-danger-light hover:text-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate(`/subjects/${id}`)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={selected.size === 0} onClick={approveSelected}>
                Approve {selected.size > 0 ? selected.size : ''} card{selected.size === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="w-full max-w-sm text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary-light text-secondary mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">{selected.size} cards added</h1>
            <p className="text-sm text-neutral-500 mt-1 mb-6">
              They're now in {subject.name}'s deck and will enter the review queue on schedule.
            </p>
            <Button variant="primary" className="w-full" onClick={() => navigate(`/subjects/${id}`)}>
              Back to {subject.name}
            </Button>
          </div>
        )}
      </div>

      <CardFormModal
        open={!!editingCard}
        onClose={() => setEditingCard(null)}
        onSave={saveEdit}
        initialCard={editingCard}
      />
    </div>
  )
}
