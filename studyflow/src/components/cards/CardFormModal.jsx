import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const MAX_LEN = 500

// Shared create/edit form per spec section 12 item 6 (Card creation/editing).
// Front/back are the two fields per the spec's flashcard model — no extra
// fields invented since neither spec mentions tags/difficulty at creation time.
// `subjects` is optional: pass it (global Flashcards screen) to show a
// subject picker so a card can be filed correctly with no subject context
// already in the URL. Per-subject callers (SubjectDetail, GenerateCards)
// omit it and get the original two-field form, unchanged.
export default function CardFormModal({ open, onClose, onSave, initialCard, subjects, initialSubjectId }) {
  const isEdit = !!initialCard
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setFront(initialCard?.front ?? '')
    setBack(initialCard?.back ?? '')
    setSubjectId(initialCard?.subjectId ?? initialSubjectId ?? '')
    setErrors({})
  }, [open, initialCard, initialSubjectId])

  function handleSave() {
    const nextErrors = {}
    if (subjects && !isEdit && !subjectId) nextErrors.subject = 'Choose a subject.'
    if (!front.trim()) nextErrors.front = 'Question is required.'
    if (!back.trim()) nextErrors.back = 'Answer is required.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    onSave({ front: front.trim(), back: back.trim(), subjectId: subjectId || undefined })
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit card' : 'Add card'}>
      <div className="flex flex-col gap-4">
        {subjects && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-subject" className="text-sm font-medium text-neutral-700">
              Subject
            </label>
            <select
              id="card-subject"
              value={subjectId}
              disabled={isEdit}
              onChange={(e) => setSubjectId(e.target.value)}
              aria-invalid={!!errors.subject}
              className={[
                'w-full rounded-md border px-3 py-2.5 text-sm text-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500',
                'focus-visible:outline-2 focus-visible:outline-primary',
                errors.subject ? 'border-danger' : 'border-neutral-300',
              ].join(' ')}
            >
              <option value="" disabled>
                Select a subject
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.subject && <p className="text-sm text-danger">{errors.subject}</p>}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="card-front" className="text-sm font-medium text-neutral-700">
            Question
          </label>
          <textarea
            id="card-front"
            rows={3}
            value={front}
            maxLength={MAX_LEN}
            onChange={(e) => setFront(e.target.value)}
            aria-invalid={!!errors.front}
            aria-describedby={errors.front ? 'card-front-error' : undefined}
            className={[
              'w-full rounded-md border px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 resize-none',
              'focus-visible:outline-2 focus-visible:outline-primary',
              errors.front ? 'border-danger' : 'border-neutral-300',
            ].join(' ')}
            placeholder="e.g. What is a binary search tree?"
          />
          {errors.front && (
            <p id="card-front-error" className="text-sm text-danger">
              {errors.front}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="card-back" className="text-sm font-medium text-neutral-700">
            Answer
          </label>
          <textarea
            id="card-back"
            rows={4}
            value={back}
            maxLength={MAX_LEN}
            onChange={(e) => setBack(e.target.value)}
            aria-invalid={!!errors.back}
            aria-describedby={errors.back ? 'card-back-error' : undefined}
            className={[
              'w-full rounded-md border px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 resize-none',
              'focus-visible:outline-2 focus-visible:outline-primary',
              errors.back ? 'border-danger' : 'border-neutral-300',
            ].join(' ')}
            placeholder="e.g. A binary tree where each node's left subtree..."
          />
          {errors.back && (
            <p id="card-back-error" className="text-sm text-danger">
              {errors.back}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {isEdit ? 'Save changes' : 'Add card'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
