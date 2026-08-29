import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, Sparkles, RefreshCw, Trash2, AlertCircle, CheckCircle2, Upload, X } from 'lucide-react'
import FlowTopBar from '../components/ui/FlowTopBar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CardFormModal from '../components/cards/CardFormModal'
import { getSubject } from '../lib/subjectsStore'
import { addCards, nextCardId } from '../lib/cardsStore'
import { extractText, ExtractionError, ACCEPTED_TYPES } from '../lib/materialText'
import { generateCards, regenerateCard, GenerationError } from '../lib/generationClient'
import { uploadMaterialFile, getMaterialsWithCoverage, getMaterialText, markChunksCovered, deleteMaterial } from '../lib/materialsStore'

// Screen build order item 7 (AI-generated cards), spec section 4.4 + 8.
// Flow: source -> processing -> review/approve -> done. Cards stay
// "candidates" (not written to the subject's trusted deck) until approved,
// per the spec's trust/approval requirement.
//
// Pipeline (PRD 12.4 + 20-22): the file is picked and its text extracted
// client-side (materialText.js), then the text goes to the generate-cards
// Edge Function which does chunked, schema-validated LLM generation.
export default function GenerateCards() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(undefined) // undefined = loading, null = not found

  const [step, setStep] = useState('source') // source | processing | error | fully-covered | review | done
  const [file, setFile] = useState(null) // the picked File, pre-extraction
  const [material, setMaterial] = useState(null) // { name, pages, text, truncated }
  const [phase, setPhase] = useState('') // processing sub-stage label
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  // "Generate more" support: pick a previously uploaded material instead of
  // uploading again. existingMaterials is the browse list; selectedMaterial
  // is set once picked (drives the coverage-tracked generate path).
  const [existingMaterials, setExistingMaterials] = useState([])
  const [selectedMaterial, setSelectedMaterial] = useState(null) // { id, name }
  const [pendingDeleteMaterial, setPendingDeleteMaterial] = useState(null) // { id, name, storagePath }
  const [deletingMaterial, setDeletingMaterial] = useState(false)
  const [genMaterialId, setGenMaterialId] = useState(null) // materialId returned by this generation pass, for coverage on approve
  const [genSource, setGenSource] = useState(null) // { materialName, text } actually used for this generation — set for both upload and existing-material paths, since regenerate needs it and `material` is only populated on upload

  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [editingCard, setEditingCard] = useState(null)
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [regenError, setRegenError] = useState(null)

  useEffect(() => {
    getSubject(id).then((s) => setSubject(s ?? null))
    getMaterialsWithCoverage(id).then(setExistingMaterials).catch(() => setExistingMaterials([]))
  }, [id])

  async function pickFile(e) {
    const picked = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file after removing it
    if (!picked) return
    setError('')
    setFile(picked)
    setMaterial(null)
    // Extract immediately so a bad/scanned file fails here, before the
    // user commits to generating — and so "Generate" is instant after.
    setStep('processing')
    setPhase(`Reading ${picked.name}…`)
    try {
      const extracted = await extractText(picked)
      setMaterial(extracted)
      setStep('source')
    } catch (err) {
      setError(err instanceof ExtractionError ? err.message : `Couldn't read "${picked.name}".`)
      setFile(null)
      setStep('error')
    }
  }

  function removeFile() {
    setFile(null)
    setMaterial(null)
    setSelectedMaterial(null)
    setGenMaterialId(null)
    setGenSource(null)
    setError('')
  }

  // Existing material picked from the list: fetch its stored text (no
  // re-upload, no re-extraction) and go straight to generation.
  async function pickExistingMaterial(m) {
    setError('')
    setStep('processing')
    setPhase(`Loading ${m.name}…`)
    try {
      const { materialName, text } = await getMaterialText(m.id)
      setSelectedMaterial(m)
      setFile(null)
      await runGeneration({ materialId: m.id, materialName, text })
    } catch {
      setError(`Couldn't load "${m.name}". Try again.`)
      setStep('error')
    }
  }

  async function confirmDeleteMaterial() {
    if (!pendingDeleteMaterial) return
    setDeletingMaterial(true)
    try {
      await deleteMaterial(pendingDeleteMaterial.id, pendingDeleteMaterial.storagePath)
      setExistingMaterials((prev) => prev.filter((m) => m.id !== pendingDeleteMaterial.id))
      setPendingDeleteMaterial(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed. Try again.')
    } finally {
      setDeletingMaterial(false)
    }
  }

  async function startGeneration() {
    if (!material) return
    setStep('processing')
    setPhase('Uploading material…')
    try {
      const storagePath = await uploadMaterialFile(file)
      await runGeneration({ storagePath, subjectId: id, materialName: material.name, text: material.text })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Try again.')
      setStep('error')
    }
  }

  // Shared by both entry points (new upload vs. existing material).
  async function runGeneration({ materialId, storagePath, materialName, text }) {
    setPhase('Generating cards with AI…')
    setGenSource({ materialName, text })
    try {
      const { cards, fullyCovered, materialId: returnedMaterialId } = await generateCards({
        subjectId: id,
        materialName,
        text,
        materialId,
        storagePath,
      })
      setGenMaterialId(returnedMaterialId ?? null)
      if (cards.length === 0 && fullyCovered) {
        setStep('fully-covered')
        return
      }
      if (cards.length === 0) {
        setError('The material didn\u2019t contain enough testable content. Try a more detailed document.')
        setStep('error')
        return
      }
      setCandidates(cards)
      setSelected(new Set(cards.map((c) => c.id)))
      setStep('review')
      getMaterialsWithCoverage(id).then(setExistingMaterials).catch(() => {})
    } catch (err) {
      setError(
        err instanceof GenerationError
          ? err.message
          : 'Generation failed unexpectedly. Nothing was lost \u2014 try again.'
      )
      setStep('error')
    }
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
    if (!genSource) return
    setRegeneratingId(card.id)
    setRegenError(null)
    try {
      const { cards } = await regenerateCard({
        subjectId: id,
        materialName: genSource.materialName,
        text: genSource.text,
        card: { front: card.front, back: card.back, sourceRef: card.sourceRef },
      })
      if (cards.length === 0) throw new Error('empty')
      // Regenerate doesn't go through the chunked path, so it doesn't know
      // which chunk it came from — carry over the original card's so
      // approving the replacement still counts toward that chunk's coverage.
      const replacement = { ...cards[0], chunkIndex: card.chunkIndex }
      setCandidates((prev) => prev.map((c) => (c.id === card.id ? replacement : c)))
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
    const approvedCandidates = candidates.filter((c) => selected.has(c.id))
    const approved = approvedCandidates.map((c) => ({ id: nextCardId(), front: c.front, back: c.back }))
    await addCards(id, approved)

    // Coverage is approve-time, not generation-time (see comment in the
    // Edge Function) — only mark chunks whose cards actually made it into
    // the deck, so discarded/never-seen chunks stay eligible for a retry.
    if (genMaterialId) {
      const chunkIndexes = [...new Set(approvedCandidates.map((c) => c.chunkIndex).filter((i) => i != null))]
      markChunksCovered(genMaterialId, chunkIndexes).catch((err) => console.error('coverage update failed:', err))
    }

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

  const formatSize = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`)

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

            {!file ? (
              <>
                <h1 className="text-lg font-semibold text-neutral-900">Add source material</h1>
                <p className="text-sm text-neutral-500 mt-1 mb-6">
                  Upload a lecture PDF, DOCX, or text file and AI will turn it into flashcards.
                </p>

                {existingMaterials.length > 0 && (
                  <div className="text-left mb-6">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                      Or generate more from a material you've already used
                    </p>
                    <div className="flex flex-col gap-2">
                      {existingMaterials.map((m) => (
                        <div
                          key={m.id}
                          className="w-full flex items-center gap-2 border border-neutral-200 rounded-lg pl-3 pr-1.5 py-1.5 hover:border-primary hover:bg-primary-light/20 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => pickExistingMaterial(m)}
                            disabled={m.fullyCovered}
                            className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left py-1 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <span className="text-sm font-medium text-neutral-800 truncate">{m.name}</span>
                            <span className="text-xs text-neutral-400 shrink-0">
                              {m.fullyCovered ? 'Fully covered' : `${m.coveredChunks}/${m.totalChunks} sections used`}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteMaterial(m)}
                            aria-label={`Delete material: ${m.name}`}
                            className="p-1.5 rounded-md text-neutral-400 hover:bg-danger-light hover:text-danger shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">Or upload a new file below.</p>
                  </div>
                )}

                <label
                  className="block border-2 border-dashed border-neutral-300 rounded-lg p-8 cursor-pointer hover:border-primary hover:bg-primary-light/30 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    onChange={pickFile}
                    className="sr-only"
                    aria-label="Choose material file"
                  />
                  <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                  <span className="text-sm font-medium text-neutral-700">Choose a file</span>
                  <span className="block text-xs text-neutral-400 mt-1">PDF, DOCX, TXT or MD — up to 20 MB</span>
                </label>
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-neutral-900 break-words">{material?.name ?? file.name}</h1>
                <p className="text-sm text-neutral-500 mt-1 mb-6">
                  {material
                    ? `${material.pages ? `${material.pages} pages · ` : ''}${formatSize(file.size)} · ready to generate`
                    : 'Reading file…'}
                </p>
                <button
                  type="button"
                  onClick={removeFile}
                  className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-danger mb-4"
                >
                  <X className="w-4 h-4" />
                  Remove file
                </button>
                {material?.truncated && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
                    This document is very large — only the first part was used.
                  </p>
                )}
                {material?.garbled && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
                    Some characters in this document couldn't be read cleanly — cards may miss a few details.
                  </p>
                )}
                <Button variant="primary" className="w-full" disabled={!material} onClick={startGeneration}>
                  <Sparkles className="w-4 h-4" />
                  Generate cards from this material
                </Button>
              </>
            )}
          </div>
        )}

        {step === 'processing' && (
          <div className="w-full max-w-md text-center">
            <p className="text-sm font-medium text-neutral-900 mb-1 break-words">{file?.name ?? selectedMaterial?.name}</p>
            <p className="text-sm text-neutral-500 mb-6">{phase || 'Working…'}</p>
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
            <h1 className="text-lg font-semibold text-neutral-900">
              {file || selectedMaterial ? 'Generation failed' : 'Add source material'}
            </h1>
            <p className="text-sm text-neutral-500 mt-1 mb-6">{error}</p>
            <div className="flex justify-center gap-2">
              {file && (
                <Button variant="primary" onClick={startGeneration}>
                  Retry
                </Button>
              )}
              {selectedMaterial && !file && (
                <Button variant="primary" onClick={() => pickExistingMaterial(selectedMaterial)}>
                  Retry
                </Button>
              )}
              <Button variant="secondary" onClick={() => { removeFile(); setStep('source') }}>
                {file || selectedMaterial ? 'Choose another source' : 'Try again'}
              </Button>
            </div>
          </div>
        )}

        {step === 'fully-covered' && (
          <div className="w-full max-w-md text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary-light text-secondary mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">All caught up on this material</h1>
            <p className="text-sm text-neutral-500 mt-1 mb-6">
              {selectedMaterial?.name ?? 'This material'} has already produced cards from every section. Upload something new, or pick a different material.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="secondary" onClick={() => { removeFile(); setStep('source') }}>
                Choose another source
              </Button>
              <Button variant="primary" onClick={() => navigate(`/subjects/${id}`)}>
                Back to {subject.name}
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-semibold text-neutral-900">Review generated cards</h1>
                <p className="text-sm text-neutral-500">
                  {selected.size} of {candidates.length} selected — approve to add them to {subject.name}.
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
              <div className="bg-surface border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
                All candidates discarded. Go back and generate again if you'd like another pass.
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-6">
                {candidates.map((card) => (
                  <div key={card.id} className="bg-surface border border-neutral-200 rounded-lg p-4">
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

      <Modal
        open={!!pendingDeleteMaterial}
        onClose={() => setPendingDeleteMaterial(null)}
        title="Delete this material?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            This permanently removes &ldquo;{pendingDeleteMaterial?.name}&rdquo; and its uploaded file. Cards you've
            already generated and approved from it are not affected — this only removes the source material itself.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingDeleteMaterial(null)} disabled={deletingMaterial}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteMaterial} disabled={deletingMaterial}>
              {deletingMaterial ? 'Deleting…' : 'Delete material'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}