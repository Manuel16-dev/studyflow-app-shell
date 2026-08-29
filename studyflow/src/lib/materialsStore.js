// Materials, backed by Supabase (`materials` + `material_chunks` tables,
// storage bucket `materials`, all RLS-scoped to auth.uid()).
//
// The Edge Function owns chunk creation/coverage updates (it's the source
// of truth for the chunking algorithm) — this store only uploads the raw
// file and reads back coverage state for the browse UI.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

const BUCKET = 'materials'

// Uploads the raw file to `${userId}/${timestamp}-${filename}`. Called
// before the first generate-cards call for a new material; the returned
// path is sent to the Edge Function, which persists the `materials` row.
export async function uploadMaterialFile(file) {
  const userId = await requireUserId()
  const path = `${userId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
  })
  if (error) throw new Error(`Couldn't upload file: ${error.message}`)
  return path
}

// Materials for a subject with coverage summary, newest first — powers the
// "pick existing material" list in the generate flow.
export async function getMaterialsWithCoverage(subjectId) {
  const { data, error } = await supabase
    .from('materials')
    .select('id, name, created_at, storage_path, material_chunks(covered)')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((m) => {
    const chunks = m.material_chunks ?? []
    const covered = chunks.filter((c) => c.covered).length
    return {
      id: m.id,
      name: m.name,
      createdAt: m.created_at,
      storagePath: m.storage_path,
      totalChunks: chunks.length,
      coveredChunks: covered,
      fullyCovered: chunks.length > 0 && covered === chunks.length,
    }
  })
}

// Deletes a material and its chunks (DB cascade handles material_chunks),
// plus the uploaded file in storage — cascade doesn't reach storage, so
// skipping this step would leave orphaned files behind on every delete.
// Storage cleanup runs first: if it fails we bail before touching the row,
// so a partial delete never leaves a DB record pointing at a dead path.
export async function deleteMaterial(id, storagePath) {
  if (storagePath) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath])
    if (storageError) throw new Error(`Couldn't remove uploaded file: ${storageError.message}`)
  }
  const { error } = await supabase.from('materials').delete().eq('id', id)
  if (error) throw new Error(`Couldn't delete material: ${error.message}`)
}

// Called after the user approves cards from a "generate more" pass — marks
// only the chunks that produced an approved card as covered. Chunks that
// generated cards but got fully discarded stay uncovered and are eligible
// to be drawn from again next time.
export async function markChunksCovered(materialId, chunkIndexes) {
  if (!materialId || chunkIndexes.length === 0) return
  const { error } = await supabase
    .from('material_chunks')
    .update({ covered: true })
    .eq('material_id', materialId)
    .in('chunk_index', chunkIndexes)
  if (error) throw new Error(`Couldn't update coverage: ${error.message}`)
}

// Full extracted text for a previously uploaded material — needed to send
// back to generate-cards on a "generate more" pass, since the Edge Function
// re-derives chunk boundaries from this text rather than storing them.
export async function getMaterialText(materialId) {
  const { data, error } = await supabase
    .from('materials')
    .select('name, extracted_text')
    .eq('id', materialId)
    .single()
  if (error) throw error
  return { materialName: data.name, text: data.extracted_text }
}