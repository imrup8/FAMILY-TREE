'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { DashboardStats } from '@/types'

function StatCard({ label, value, icon, color, href }: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  href?: string
}) {
  const card = (
    <div style={{
      background: 'var(--color-surface)',
      border: `1px solid var(--color-border)`,
      borderRadius: 'var(--radius)',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'all 0.2s',
    }}
    className={href ? 'card-hover' : ''}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
        background: `${color}22`,
        border: `1px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-bengali)', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
          {label}
        </p>
        <p style={{ fontSize: '1.75rem', fontWeight: '700', lineHeight: 1, color: 'var(--color-text)', fontFamily: 'var(--font-latin)' }}>
          {value}
        </p>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{card}</Link>
  }
  return card
}

function ProcessingJobRow({ job }: { job: { id: string; page_id: string; status: string; created_at: string } }) {
  const statusColors: Record<string, string> = {
    queued: '#9ca3af',
    running: '#fbbf24',
    completed: '#34d399',
    failed: '#f87171',
  }

  return (
    <tr>
      <td style={{ fontFamily: 'var(--font-latin)', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
        {job.id.slice(0, 8)}...
      </td>
      <td>
        <span className="badge" style={{
          background: `${statusColors[job.status]}22`,
          color: statusColors[job.status],
          border: `1px solid ${statusColors[job.status]}44`,
          fontFamily: 'var(--font-bengali)',
        }}>
          {job.status === 'queued' ? 'অপেক্ষায়' :
           job.status === 'running' ? 'চলছে' :
           job.status === 'completed' ? 'সম্পন্ন' : 'ব্যর্থ'}
        </span>
      </td>
      <td style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-latin)' }}>
        {new Date(job.created_at).toLocaleString('bn-BD')}
      </td>
    </tr>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <div className="skeleton" style={{ width: '200px', height: '32px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '300px', height: '20px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '96px', borderRadius: 'var(--radius)' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-bengali)', fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          ড্যাশবোর্ড
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)' }}>
          আপনার পারিবারিক বংশতালিকার সামগ্রিক চিত্র
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard
          label="মোট ব্যক্তি"
          value={stats?.total_people ?? 0}
          href="/dashboard/people"
          color="#6366f1"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="প্রজন্ম"
          value={stats?.generations ?? 0}
          color="#a78bfa"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="আপলোড করা নথি"
          value={stats?.total_documents ?? 0}
          href="/dashboard/documents"
          color="#3b82f6"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard
          label="পর্যালোচনা অপেক্ষায়"
          value={stats?.pending_reviews ?? 0}
          href="/dashboard/review"
          color="#f59e0b"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
        <StatCard
          label="সম্ভাব্য ডুপ্লিকেট"
          value={stats?.pending_duplicates ?? 0}
          href="/dashboard/duplicates"
          color="#f97316"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          label="বিরোধ"
          value={stats?.pending_conflicts ?? 0}
          href="/dashboard/conflicts"
          color="#ef4444"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Quick Actions Card */}
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-bengali)', fontWeight: '600', marginBottom: '1rem', fontSize: '1rem' }}>
            দ্রুত কাজ
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/dashboard/upload" className="btn btn-primary" style={{ fontFamily: 'var(--font-bengali)', justifyContent: 'flex-start' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              নতুন নথি আপলোড করুন
            </Link>
            <Link href="/dashboard/review" className="btn btn-secondary" style={{ fontFamily: 'var(--font-bengali)', justifyContent: 'flex-start' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              AI সুপারিশ পর্যালোচনা করুন
            </Link>
            <Link href="/dashboard/tree" className="btn btn-secondary" style={{ fontFamily: 'var(--font-bengali)', justifyContent: 'flex-start' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              বংশবৃক্ষ দেখুন
            </Link>
            <Link href="/dashboard/export" className="btn btn-secondary" style={{ fontFamily: 'var(--font-bengali)', justifyContent: 'flex-start' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ডেটা এক্সপোর্ট করুন
            </Link>
          </div>
        </div>

        {/* Processing Jobs */}
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-bengali)', fontWeight: '600', marginBottom: '1rem', fontSize: '1rem' }}>
            প্রক্রিয়াকরণ অবস্থা
          </h2>
          {stats?.processing_jobs && stats.processing_jobs.length > 0 ? (
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ fontFamily: 'var(--font-bengali)' }}>আইডি</th>
                    <th style={{ fontFamily: 'var(--font-bengali)' }}>অবস্থা</th>
                    <th style={{ fontFamily: 'var(--font-bengali)' }}>সময়</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.processing_jobs.slice(0, 5).map(job => (
                    <ProcessingJobRow key={job.id} job={job as { id: string; page_id: string; status: string; created_at: string }} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-dim)' }}>
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p style={{ fontFamily: 'var(--font-bengali)', fontSize: '0.875rem' }}>কোনো সক্রিয় কাজ নেই</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Changes */}
      {stats?.recent_changes && stats.recent_changes.length > 0 && (
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-bengali)', fontWeight: '600', marginBottom: '1rem', fontSize: '1rem' }}>
            সাম্প্রতিক পরিবর্তন
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats.recent_changes.slice(0, 10).map(change => (
              <div key={change.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem',
                background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: change.change_type === 'create' ? 'var(--color-success)' :
                               change.change_type === 'delete' ? 'var(--color-error)' : 'var(--color-warning)',
                }} />
                <span style={{ fontFamily: 'var(--font-bengali)', color: 'var(--color-text-muted)' }}>
                  {change.entity_type === 'person' ? 'ব্যক্তি' : 'সম্পর্ক'}{' '}
                  {change.change_type === 'create' ? 'যোগ করা হয়েছে' :
                   change.change_type === 'update' ? 'আপডেট করা হয়েছে' :
                   change.change_type === 'delete' ? 'মুছে ফেলা হয়েছে' :
                   change.change_type === 'approve' ? 'অনুমোদিত হয়েছে' : change.change_type}
                </span>
                <span style={{ marginLeft: 'auto', color: 'var(--color-text-dim)', fontFamily: 'var(--font-latin)', fontSize: '0.75rem' }}>
                  {new Date(change.created_at).toLocaleString('bn-BD')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats && stats.total_people === 0 && (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1.5rem',
            background: 'var(--color-primary-glow)', border: '2px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg className="w-10 h-10" style={{ color: 'var(--color-primary-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-bengali)', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            আপনার বংশতালিকা শুরু করুন
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            হস্তলিখিত পারিবারিক নথি আপলোড করুন। AI স্বয়ংক্রিয়ভাবে নাম ও সম্পর্ক সনাক্ত করবে।
          </p>
          <Link href="/dashboard/upload" className="btn btn-primary" style={{ fontFamily: 'var(--font-bengali)', display: 'inline-flex' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            প্রথম নথি আপলোড করুন
          </Link>
        </div>
      )}
    </div>
  )
}
