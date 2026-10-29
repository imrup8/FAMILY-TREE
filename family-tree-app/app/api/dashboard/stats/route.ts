import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    // Run all count queries in parallel
    const [
      peopleResult,
      documentsResult,
      pagesResult,
      reviewResult,
      duplicatesResult,
      conflictsResult,
      generationsResult,
      recentChangesResult,
      processingJobsResult,
    ] = await Promise.all([
      supabaseAdmin.from('people').select('id', { count: 'exact' }).is('deleted_at', null),
      supabaseAdmin.from('documents').select('id', { count: 'exact' }).is('deleted_at', null),
      supabaseAdmin.from('document_pages').select('id', { count: 'exact' }),
      supabaseAdmin.from('review_items').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabaseAdmin.from('duplicate_candidates').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabaseAdmin.from('review_items').select('id', { count: 'exact' }).eq('status', 'pending').eq('item_type', 'conflict'),
      supabaseAdmin.from('people').select('generation_number').is('deleted_at', null).not('generation_number', 'is', null).order('generation_number', { ascending: false }).limit(1),
      supabaseAdmin.from('change_history').select('*').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('processing_jobs').select('*').in('status', ['queued', 'running']).order('created_at', { ascending: false }).limit(10),
    ])

    const maxGeneration = generationsResult.data?.[0]?.generation_number ?? 0

    const stats = {
      total_people: peopleResult.count ?? 0,
      total_documents: documentsResult.count ?? 0,
      total_pages: pagesResult.count ?? 0,
      pending_reviews: reviewResult.count ?? 0,
      pending_duplicates: duplicatesResult.count ?? 0,
      pending_conflicts: conflictsResult.count ?? 0,
      generations: maxGeneration,
      recent_changes: recentChangesResult.data ?? [],
      processing_jobs: processingJobsResult.data ?? [],
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'সার্ভার ত্রুটি। পরে আবার চেষ্টা করুন।' },
      { status: 500 }
    )
  }
}
