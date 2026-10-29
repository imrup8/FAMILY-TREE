import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'

// GET /api/people/[id] - Get person with full relatives
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const { data: person, error } = await supabaseAdmin
    .from('people')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !person) {
    return NextResponse.json({ error: 'ব্যক্তি পাওয়া যায়নি' }, { status: 404 })
  }

  // Fetch all relationships involving this person
  const { data: relationships } = await supabaseAdmin
    .from('relationships')
    .select(`
      *,
      person_a:people!relationships_person_a_id_fkey(*),
      person_b:people!relationships_person_b_id_fkey(*)
    `)
    .or(`person_a_id.eq.${id},person_b_id.eq.${id}`)
    .is('deleted_at', null)

  // Categorize relatives
  const parents: unknown[] = []
  const children: unknown[] = []
  const spouses: unknown[] = []
  const siblings: unknown[] = []

  for (const rel of (relationships || [])) {
    const isPersonA = rel.person_a_id === id
    const other = isPersonA ? rel.person_b : rel.person_a

    if (rel.relationship_type === 'parent_child') {
      if ((isPersonA && rel.direction === 'a_to_b') || (!isPersonA && rel.direction === 'b_to_a')) {
        children.push(other)
      } else {
        parents.push(other)
      }
    } else if (rel.relationship_type === 'spouse') {
      spouses.push(other)
    } else if (rel.relationship_type === 'sibling') {
      siblings.push(other)
    }
  }

  // Fetch source documents
  const { data: sourceLinks } = await supabaseAdmin
    .from('person_source_links')
    .select(`
      *,
      document:documents(*),
      page:document_pages(*)
    `)
    .eq('person_id', id)

  // Fetch attachments
  const { data: attachments } = await supabaseAdmin
    .from('person_attachments')
    .select('*')
    .eq('person_id', id)

  // Fetch change history
  const { data: changes } = await supabaseAdmin
    .from('change_history')
    .select('*')
    .eq('entity_type', 'person')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    ...person,
    parents,
    children,
    spouses,
    siblings,
    source_documents: sourceLinks?.map(l => l.page) ?? [],
    attachments: attachments ?? [],
    change_history: changes ?? [],
  })
}

// PATCH /api/people/[id] - Update a person
const UpdatePersonSchema = z.object({
  name_bengali: z.string().min(1).optional(),
  name_normalized: z.string().optional().nullable(),
  name_transliterated: z.string().optional().nullable(),
  alternate_names: z.array(z.string()).optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  birth_date: z.string().optional().nullable(),
  birth_date_approximate: z.boolean().optional(),
  death_date: z.string().optional().nullable(),
  death_date_approximate: z.boolean().optional(),
  is_living: z.boolean().optional(),
  birth_place: z.string().optional().nullable(),
  death_place: z.string().optional().nullable(),
  residence: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  biography: z.string().optional().nullable(),
  generation_number: z.number().optional().nullable(),
  verification_status: z.enum(['unverified', 'ai_extracted', 'user_reviewed', 'verified']).optional(),
}).partial()

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, 'editor')
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'অবৈধ JSON' }, { status: 400 })
  }

  const validation = UpdatePersonSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'যাচাইকরণ ব্যর্থ', details: validation.error.flatten() }, { status: 400 })
  }

  // Get current state for history
  const { data: current } = await supabaseAdmin.from('people').select('*').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'ব্যক্তি পাওয়া যায়নি' }, { status: 404 })

  const { data: updated, error } = await supabaseAdmin
    .from('people')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Record change
  await supabaseAdmin.from('change_history').insert({
    entity_type: 'person',
    entity_id: id,
    change_type: 'update',
    previous_data: current,
    new_data: updated,
    changed_by: auth.userId,
    change_source: 'manual',
  })

  return NextResponse.json(updated)
}

// DELETE /api/people/[id] - Soft delete a person
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, 'admin')
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const { data: current } = await supabaseAdmin.from('people').select('*').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'ব্যক্তি পাওয়া যায়নি' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('people')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('change_history').insert({
    entity_type: 'person',
    entity_id: id,
    change_type: 'delete',
    previous_data: current,
    changed_by: auth.userId,
    change_source: 'manual',
  })

  return NextResponse.json({ success: true })
}
