import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { analyzeGenealgyDocument, analyzePDFPage } from '@/lib/gemini/client'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'editor')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const { data: job, error: jobError } = await supabaseAdmin.from('processing_jobs').select('*').eq('id', id).single()
  if (jobError || !job) return NextResponse.json({ error: 'প্রসেসিং কাজ পাওয়া যায়নি' }, { status: 404 })
  if (job.status === 'running') return NextResponse.json({ error: 'কাজটি ইতিমধ্যে চলছে' }, { status: 409 })
  if (!job.page_id) return NextResponse.json({ error: 'পেজ ছাড়া AI বিশ্লেষণ করা যায় না' }, { status: 400 })

  await supabaseAdmin.from('processing_jobs').update({ status: 'running', started_at: new Date().toISOString(), attempts: job.attempts + 1 }).eq('id', id)
  await supabaseAdmin.from('document_pages').update({ status: 'analyzing' }).eq('id', job.page_id)
  try {
    const { data: page } = await supabaseAdmin.from('document_pages').select('*').eq('id', job.page_id).single()
    if (!page) throw new Error('Document page not found')
    const { data: file, error: downloadError } = await supabaseAdmin.storage.from('documents').download(page.storage_path)
    if (downloadError || !file) throw downloadError ?? new Error('Could not download document page')
    const extraction = page.file_type === 'pdf'
      ? await analyzePDFPage(Buffer.from(await file.arrayBuffer()), page.page_number - 1, job.document_id, page.id)
      : await analyzeGenealgyDocument(
          Buffer.from(await file.arrayBuffer()),
          page.file_type === 'jpg' || page.file_type === 'jpeg' ? 'image/jpeg' : `image/${page.file_type}`,
          job.document_id,
          page.id,
        )

    const candidateRows = extraction.people.map(person => ({
      document_id: job.document_id, page_id: page.id, temporary_id: person.temporary_id,
      name_original_script: person.name_original_script, normalized_name: person.normalized_name,
      alternate_spellings: person.alternate_spellings, gender: person.gender,
      birth_date: person.birth_date, death_date: person.death_date, notes: person.notes,
      text_confidence: person.text_confidence, source_region: person.source_region,
      raw_extraction: person, review_status: 'pending',
    }))
    const { data: candidates, error: candidateError } = await supabaseAdmin.from('extracted_candidates').insert(candidateRows).select()
    if (candidateError) throw candidateError
    const reviewRows = (candidates ?? []).map(candidate => ({
      document_id: job.document_id, page_id: page.id, item_type: 'new_person',
      extracted_candidate_id: candidate.id, proposed_data: {
        name_original_script: candidate.name_original_script,
        name_normalized: candidate.normalized_name, alternate_names: candidate.alternate_spellings,
        gender: candidate.gender, birth_date: candidate.birth_date, death_date: candidate.death_date, notes: candidate.notes,
      }, confidence_score: candidate.text_confidence, warnings: extraction.warnings, status: 'pending',
    }))
    if (reviewRows.length) await supabaseAdmin.from('review_items').insert(reviewRows)
    await supabaseAdmin.from('document_pages').update({ status: 'needs_review' }).eq('id', page.id)
    await supabaseAdmin.from('processing_jobs').update({ status: 'completed', completed_at: new Date().toISOString(), result_summary: { people: extraction.people.length, relationships: extraction.relationships.length } }).eq('id', id)
    return NextResponse.json({ extraction, candidates: candidates ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI processing failed'
    await supabaseAdmin.from('processing_jobs').update({ status: 'failed', completed_at: new Date().toISOString(), error_message: message }).eq('id', id)
    await supabaseAdmin.from('document_pages').update({ status: 'failed', processing_error: message }).eq('id', job.page_id)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
