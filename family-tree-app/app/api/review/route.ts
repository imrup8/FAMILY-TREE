import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'

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
