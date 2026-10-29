import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'

// GET /api/people - List all people with search/filter
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const gender = searchParams.get('gender')
  const status = searchParams.get('status')
  const offset = (page - 1) * limit

  let queryBuilder = supabaseAdmin
    .from('people')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('name_bengali', { ascending: true })
    .range(offset, offset + limit - 1)

  if (query) {
    // Search across Bengali name, alternate names, normalized name
    queryBuilder = queryBuilder.or(
      `name_bengali.ilike.%${query}%,name_normalized.ilike.%${query}%,name_transliterated.ilike.%${query}%`
    )
  }

  if (gender && ['male', 'female', 'other', 'unknown'].includes(gender)) {
    queryBuilder = queryBuilder.eq('gender', gender)
  }

  if (status) {
    queryBuilder = queryBuilder.eq('verification_status', status)
  }

  const { data, error, count } = await queryBuilder

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize: limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}

// POST /api/people - Create a new person
const CreatePersonSchema = z.object({
  name_bengali: z.string().min(1, 'নাম আবশ্যক'),
  name_normalized: z.string().optional().nullable(),
  name_transliterated: z.string().optional().nullable(),
  alternate_names: z.array(z.string()).default([]),
  gender: z.enum(['male', 'female', 'other', 'unknown']).default('unknown'),
  birth_date: z.string().optional().nullable(),
  birth_date_approximate: z.boolean().default(false),
  death_date: z.string().optional().nullable(),
  death_date_approximate: z.boolean().default(false),
  is_living: z.boolean().default(false),
  birth_place: z.string().optional().nullable(),
  death_place: z.string().optional().nullable(),
  residence: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  biography: z.string().optional().nullable(),
  generation_number: z.number().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'editor')
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'অবৈধ JSON ডেটা' }, { status: 400 })
  }

  const validation = CreatePersonSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'যাচাইকরণ ব্যর্থ হয়েছে', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const data = validation.data

  const { data: person, error } = await supabaseAdmin
    .from('people')
    .insert({
      ...data,
      display_id: '', // Will be set by trigger
      verification_status: 'verified',
      data_source: 'manual',
      created_by: auth.userId,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Record change history
  await supabaseAdmin.from('change_history').insert({
    entity_type: 'person',
    entity_id: person.id,
    change_type: 'create',
    new_data: person,
    changed_by: auth.userId,
    change_source: 'manual',
  })

  return NextResponse.json(person, { status: 201 })
}
