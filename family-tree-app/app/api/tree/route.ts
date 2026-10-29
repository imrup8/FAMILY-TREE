import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const root = new URL(request.url).searchParams.get('root')
  const [{ data: people, error: peopleError }, { data: relationships, error: relationshipError }] = await Promise.all([
    supabaseAdmin.from('people').select('*').is('deleted_at', null).order('generation_number', { ascending: true, nullsFirst: false }).limit(2000),
    supabaseAdmin.from('relationships').select('*').is('deleted_at', null).limit(5000),
  ])
  if (peopleError || relationshipError) return NextResponse.json({ error: peopleError?.message ?? relationshipError?.message }, { status: 500 })
  return NextResponse.json({ rootPersonId: root, nodes: people ?? [], edges: relationships ?? [] })
}
