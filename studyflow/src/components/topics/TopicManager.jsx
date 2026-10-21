import { useState } from 'react'
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { buildTopicTree, createTopic, renameTopic, deleteTopic, MAX_TOPIC_NAME } from '../../lib/topicsStore'

// Create, rename and delete topics and subtopics for one subject.
// `topics` is the flat list; every change hands the fresh list back through
// onChange so the parent screen stays the single source of truth.
export default function TopicManager({ open, onClose, subjectId, topics, onChange }) {
  const [newName, setNewName] = useState('')
  const [addingUnder, setAddingUnder] = useState(null) // parent topic id
  const [subName, setSubName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const tree = buildTopicTree(topics)

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      onChange(await action())
      return true
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addTopic(e) {
    e.preventDefault()
    if (await run(() => createTopic(subjectId, newName))) setNewName('')
  }

  async function addSubtopic(e, parentId) {
    e.preventDefault()
    if (await run(() => createTopic(subjectId, subName, parentId))) {
      setSubName('')
      setAddingUnder(null)
    }
  }

  async function saveRename(e, id) {
    e.preventDefault()
    if (await run(() => renameTopic(subjectId, id, editName))) setEditingId(null)
  }

  async function confirmDelete() {
    const target = pendingDelete
    if (await run(() => deleteTopic(subjectId, target.id))) setPendingDelete(null)
  }

  function row(topic, isChild) {
    const editing = editingId === topic.id
    return (
      <li key={topic.id} className={isChild ? 'ml-5' : ''}>
        <div className="flex items-center gap-1 py-1">
          {editing ? (
            <form className="flex items-center gap-1 flex-1" onSubmit={(e) => saveRename(e, topic.id)}>
              <input
                autoFocus
                value={editName}
                maxLength={MAX_TOPIC_NAME}
                onChange={(e) => setEditName(e.target.value)}
                aria-label={`Rename ${topic.name}`}
                className="flex-1 min-w-0 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-primary"
              />
              <button type="submit" disabled={busy} aria-label="Save name" className="p-1.5 rounded-md text-secondary-text hover:bg-neutral-100">
                <Check className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setEditingId(null)} aria-label="Cancel rename" className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100">
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <>
              <span className="flex-1 min-w-0 truncate text-sm text-neutral-900">{topic.name}</span>
              {!isChild && (
                <button
                  type="button"
                  onClick={() => {
                    setAddingUnder(addingUnder === topic.id ? null : topic.id)
                    setSubName('')
                    setError('')
                  }}
                  aria-label={`Add subtopic under ${topic.name}`}
                  className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingId(topic.id)
                  setEditName(topic.name)
                  setError('')
                }}
                aria-label={`Rename ${topic.name}`}
                className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(topic)}
                aria-label={`Delete ${topic.name}`}
                className="p-1.5 rounded-md text-neutral-500 hover:bg-danger-light hover:text-danger-text"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {addingUnder === topic.id && (
          <form className="ml-5 flex items-center gap-2 pb-1" onSubmit={(e) => addSubtopic(e, topic.id)}>
            <input
              autoFocus
              value={subName}
              maxLength={MAX_TOPIC_NAME}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="Subtopic name"
              aria-label={`New subtopic under ${topic.name}`}
              className="flex-1 min-w-0 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-primary"
            />
            <Button type="submit" variant="secondary" disabled={busy || !subName.trim()}>
              Add
            </Button>
          </form>
        )}

        {topic.children?.length > 0 && <ul>{topic.children.map((c) => row(c, true))}</ul>}
      </li>
    )
  }

  function handleClose() {
    setError('')
    setAddingUnder(null)
    setEditingId(null)
    setPendingDelete(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Manage topics">
      <div className="flex flex-col gap-4">
        {pendingDelete ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-600">
              Delete <strong>{pendingDelete.name}</strong>
              {pendingDelete.parent_id ? '' : ' and its subtopics'}? Your cards are kept and become &ldquo;No topic&rdquo;.
            </p>
            {error && <p role="alert" className="text-sm text-danger-text">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingDelete(null)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete topic'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <form className="flex items-center gap-2" onSubmit={addTopic}>
              <input
                value={newName}
                maxLength={MAX_TOPIC_NAME}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New topic, e.g. Binary Trees"
                aria-label="New topic name"
                className="flex-1 min-w-0 rounded-md border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:outline-primary"
              />
              <Button type="submit" variant="primary" disabled={busy || !newName.trim()}>
                Add
              </Button>
            </form>

            {error && <p role="alert" className="text-sm text-danger-text">{error}</p>}

            {tree.length === 0 ? (
              <p className="text-sm text-neutral-500">No topics yet. Add one above to start grouping this subject&rsquo;s cards.</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto -mr-1 pr-1">{tree.map((t) => row(t, false))}</ul>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleClose}>
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
