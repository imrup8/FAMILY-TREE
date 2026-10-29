import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, rateLimit } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '52428800') // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const STORAGE_BUCKET = 'documents'

// POST /api/documents - Create a document and upload pages
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'editor')
  if (auth instanceof NextResponse) return auth

  // Rate limit: 20 uploads per hour per user
  if (!rateLimit(`upload:${auth.userId}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'আপলোড সীমা অতিক্রম করেছেন। এক ঘণ্টা পরে আবার চেষ্টা করুন।' },
      { status: 429 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'ফর্ম ডেটা পড়তে পারিনি' }, { status: 400 })
  }

  // Extract metadata
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const source_description = formData.get('source_description') as string
  const approximate_date = formData.get('approximate_date') as string
  const notes = formData.get('notes') as string
  const tagsStr = formData.get('tags') as string
  let tags: string[] = []
  if (tagsStr) {
    try {
      const parsedTags: unknown = JSON.parse(tagsStr)
      if (!Array.isArray(parsedTags) || parsedTags.some(tag => typeof tag !== 'string')) {
        return NextResponse.json({ error: 'ট্যাগের ফরম্যাট সঠিক নয়' }, { status: 400 })
      }
      tags = parsedTags.slice(0, 50)
    } catch {
      return NextResponse.json({ error: 'ট্যাগের JSON সঠিক নয়' }, { status: 400 })
    }
  }

  if (!title?.trim()) {
    return NextResponse.json({ error: 'নথির শিরোনাম আবশ্যক' }, { status: 400 })
  }

  // Get all files
  const files = formData.getAll('files') as File[]
  if (!files.length) {
    return NextResponse.json({ error: 'কোনো ফাইল নির্বাচন করা হয়নি' }, { status: 400 })
  }

  // Validate each file
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `অনুমোদিত নয়: ${file.name}। শুধুমাত্র JPG, PNG, WebP, এবং PDF ফাইল গ্রহণযোগ্য।` },
        { status: 400 }
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `ফাইল অনেক বড়: ${file.name}। সর্বোচ্চ ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB।` },
        { status: 400 }
      )
    }
  }

  // Create the document record
  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .insert({
      display_id: '', // Set by trigger
      title: title.trim(),
      description: description?.trim() || null,
      source_description: source_description?.trim() || null,
      approximate_date: approximate_date?.trim() || null,
      notes: notes?.trim() || null,
      tags,
      uploaded_by: auth.userId,
      total_pages: files.length,
      status: 'uploaded',
    })
    .select()
    .single()

  if (docError || !document) {
    console.error('Document creation error:', docError)
    return NextResponse.json({ error: 'নথি তৈরি করতে ব্যর্থ হয়েছে' }, { status: 500 })
  }

  // Upload each file and create page records
  const pageResults = []
  let pageNumber = 1

  for (const file of files) {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const storagePath = `${document.id}/page-${pageNumber}-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      // Continue with other files but record the error
      pageResults.push({ error: uploadError.message, filename: file.name })
      pageNumber++
      continue
    }

    // Create page record
    const { data: page, error: pageError } = await supabaseAdmin
      .from('document_pages')
      .insert({
        display_id: '', // Set by trigger
        document_id: document.id,
        page_number: pageNumber,
        storage_path: storagePath,
        original_filename: file.name,
        file_type: fileExt,
        file_size_bytes: file.size,
        status: 'uploaded',
      })
      .select()
      .single()

    if (pageError || !page) {
      pageResults.push({ error: 'পেজ রেকর্ড তৈরি ব্যর্থ', filename: file.name })
    } else {
      pageResults.push({ page_id: page.id, display_id: page.display_id, filename: file.name })

      // Queue AI processing job
      await supabaseAdmin.from('processing_jobs').insert({
        document_id: document.id,
        page_id: page.id,
        job_type: 'ai_analysis',
        status: 'queued',
        priority: 5,
      })
    }

    pageNumber++
  }

  // Update document status to queued
  await supabaseAdmin
    .from('documents')
    .update({ status: 'queued' })
    .eq('id', document.id)

  return NextResponse.json({
    document: {
      id: document.id,
      display_id: document.display_id,
      title: document.title,
      status: 'queued',
    },
    pages: pageResults,
    message: `${files.length}টি ফাইল সফলভাবে আপলোড হয়েছে। AI বিশ্লেষণ শুরু হচ্ছে।`,
  }, { status: 201 })
}

// GET /api/documents - List all documents
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status')
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('documents')
    .select('*, document_pages(count)', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

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
