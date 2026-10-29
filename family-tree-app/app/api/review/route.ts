import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'

const ReviewActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'defer']),
  editedData: z.record(z.string(), z.unknown()).optional(),
  reviewNotes: z.string().max(2000).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const status = new URL(request.url).searchParams.get('status') ?? 'pending'
  const { data, error } = await supabaseAdmin
    .from('review_items')
    .select('*, extracted_candidate:extracted_candidates(*), extracted_relationship:extracted_relationships(*)')
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'editor')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const parsed = ReviewActionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ পর্যালোচনা অনুরোধ', details: parsed.error.flatten() }, { status: 400 })

  const { data: item, error: itemError } = await supabaseAdmin.from('review_items').select('*').eq('id', id).single()
  if (itemError || !item) return NextResponse.json({ error: 'পর্যালোচনা আইটেম পাওয়া যায়নি' }, { status: 404 })
  if (item.status !== 'pending') return NextResponse.json({ error: 'এই আইটেমটি ইতিমধ্যে পর্যালোচিত হয়েছে' }, { status: 409 })

  const nextStatus = parsed.data.action === 'approve' ? 'approved' : parsed.data.action === 'reject' ? 'rejected' : 'deferred'
  let changeHistoryId: string | null = null
  if (parsed.data.action === 'approve' && item.item_type === 'new_person') {
    const proposed = { ...(item.proposed_data as Record<string, unknown>), ...(parsed.data.editedData ?? {}) }
    const { data: person, error } = await supabaseAdmin.from('people').insert({
      display_id: '',
      name_bengali: String(proposed.name_bengali ?? proposed.name_original_script ?? '').trim(),
      name_normalized: (proposed.name_normalized as string | null) ?? null,
      name_transliterated: (proposed.name_transliterated as string | null) ?? null,
      alternate_names: Array.isArray(proposed.alternate_names) ? proposed.alternate_names : [],
      gender: proposed.gender ?? 'unknown',
      birth_date: (proposed.birth_date as string | null) ?? null,
      death_date: (proposed.death_date as string | null) ?? null,
      notes: Array.isArray(proposed.notes) ? proposed.notes.join('\n') : (proposed.notes as string | null) ?? null,
      verification_status: 'user_reviewed',
      data_source: 'ai_extracted',
      created_by: auth.userId,
    }).select().single()
    if (error || !person) return NextResponse.json({ error: error?.message ?? 'ব্যক্তি তৈরি করা যায়নি' }, { status: 500 })
    const { data: history } = await supabaseAdmin.from('change_history').insert({
      entity_type: 'person', entity_id: person.id, change_type: 'approve',
      new_data: person, triggered_by_review_item_id: id, changed_by: auth.userId, change_source: 'ai_approved',
    }).select('id').single()
    changeHistoryId = history?.id ?? null
    await supabaseAdmin.from('person_source_links').insert({
      person_id: person.id, document_id: item.document_id, page_id: item.page_id,
      extracted_candidate_id: item.extracted_candidate_id,
    })
  }

  const { data: updated, error } = await supabaseAdmin.from('review_items').update({
    status: nextStatus, reviewed_by: auth.userId, reviewed_at: new Date().toISOString(),
    review_notes: parsed.data.reviewNotes ?? null, change_history_id: changeHistoryId,
  }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
