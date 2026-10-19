import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { X } from 'lucide-react'
import { MAX_TAGS, MAX_TAG_LENGTH, normalizeTag, normalizeTags } from '../../lib/tags'

const MAX_LEN = 500

// Shared create/edit form per spec section 12 item 6 (Card creation/editing).
// Front/back are the two fields per the spec's flashcard model — no extra
// fields invented since neither spec mentions tags/difficulty at creation time.
// `subjects` is optional: pass it (global Flashcards screen) to show a
// subject picker so a card can be filed correctly with no subject context
// already in the URL. Per-subject callers (SubjectDetail, GenerateCards)
// omit it and get the original two-field form, unchanged.
export default function CardFormModal({ open, onClose, onSave, initialCard, subjects, initialSubjectId, tagSuggestions = [] }) {
  const isEdit = !!initialCard
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [errors, setErrors] = useState({})
  const [tags, setTags] = useState([])
  const [tagDraft, setTagDraft] = useState('')

  useEffect(() => {
    if (!open) return
    setFront(initialCard?.front ?? '')
    setBack(initialCard?.back ?? '')
    setSubjectId(initialCard?.subjectId ?? initialSubjectId ?? '')
    setTags(initialCard?.tags ?? [])
    setTagDraft('')
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
    // Pick up a tag still being typed when Save is pressed.
    const pending = normalizeTag(tagDraft)
    onSave({
      front: front.trim(),
      back: back.trim(),
      subjectId: subjectId || undefined,
      tags: normalizeTags(pending ? [...tags, pending] : tags),
    })
  }

  function commitTag() {
    const tag = normalizeTag(tagDraft)
    setTagDraft('')
    if (tag && tags.length < MAX_TAGS && !tags.includes(tag)) setTags([...tags, tag])
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
            {errors.subject && <p className="text-sm text-danger-text">{errors.subject}</p>}
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
            <p id="card-front-error" className="text-sm text-danger-text">
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
            <p id="card-back-error" className="text-sm text-danger-text">
              {errors.back}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="card-tags" className="text-sm font-medium text-neutral-700">
            Tags <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 text-neutral-700 pl-2.5 pr-1 py-0.5 text-xs">
                  #{t}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    aria-label={`Remove tag ${t}`}
                    className="p-0.5 rounded-full hover:bg-neutral-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            id="card-tags"
            type="text"
            value={tagDraft}
            list="card-tag-suggestions"
            maxLength={MAX_TAG_LENGTH}
            disabled={tags.length >= MAX_TAGS}
            onChange={(e) => setTagDraft(e.target.value.replace(',', ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                commitTag()
              }
            }}
            onBlur={commitTag}
            placeholder={tags.length >= MAX_TAGS ? `Up to ${MAX_TAGS} tags` : 'Type a tag and press Enter'}
            className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:outline-primary disabled:bg-neutral-50"
          />
          <datalist id="card-tag-suggestions">
            {tagSuggestions.filter((t) => !tags.includes(t)).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
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
