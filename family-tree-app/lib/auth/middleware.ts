import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Auth Middleware Utilities
// ============================================================

/**
 * Get the authenticated user from the request.
 * Uses Supabase session from the Authorization header or cookie.
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        // Forward the auth cookie from the request
        cookie: request.headers.get('cookie') || '',
      },
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, error: 'Unauthorized' }
  }

  return { user, error: null }
}

/**
 * Get user role from the database.
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import('@/lib/supabase/server')
  
  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  return data?.role || null
}

/**
 * Require authentication and optionally a specific role.
 * Returns an error response if not authorized, null if authorized.
 */
export async function requireAuth(
  request: NextRequest,
  requiredRole?: 'admin' | 'editor' | 'viewer',
): Promise<{ userId: string; role: string } | NextResponse> {
  const { user, error } = await getAuthenticatedUser(request)

  if (!user || error) {
    return NextResponse.json(
      { error: 'প্রমাণীকরণ প্রয়োজন। অনুগ্রহ করে লগইন করুন।' }, // Authentication required
      { status: 401 }
    )
  }

  const role = await getUserRole(user.id)

  if (!role) {
    return NextResponse.json(
      { error: 'আপনার অ্যাক্সেস অনুমতি নেই। অনুগ্রহ করে একজন অ্যাডমিনের সাথে যোগাযোগ করুন।' },
      { status: 403 }
    )
  }

  if (requiredRole) {
    const roleHierarchy = { viewer: 0, editor: 1, admin: 2 }
    const userLevel = roleHierarchy[role as keyof typeof roleHierarchy] ?? -1
    const requiredLevel = roleHierarchy[requiredRole]

    if (userLevel < requiredLevel) {
      return NextResponse.json(
        { error: 'এই কাজটি করার জন্য আপনার যথেষ্ট অনুমতি নেই।' }, // Insufficient permissions
        { status: 403 }
      )
    }
  }

  return { userId: user.id, role }
}

/**
 * Simple rate limiter using in-memory store.
 * In production, replace with Redis-based solution.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number = 20,
  windowMs: number = 60 * 60 * 1000, // 1 hour
): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true // Allowed
  }

  if (entry.count >= limit) {
    return false // Rate limited
  }

  entry.count++
  return true // Allowed
}
