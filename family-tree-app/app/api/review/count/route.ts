import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET /api/review/count - Get pending review count for sidebar badge
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { count } = await supabaseAdmin
    .from('review_items')
    .select('id', { count: 'exact' })
    .eq('status', 'pending')

  return NextResponse.json({ count: count ?? 0 })
}
