'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 8) {
      setError('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) {
      setError(`নিবন্ধন ব্যর্থ হয়েছে: ${error.message}`)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
        <div className="card text-center max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981' }}>
            <svg className="w-8 h-8" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-bengali)' }}>নিবন্ধন সম্পন্ন!</h2>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)' }}>
            আপনার ইমেইলে একটি নিশ্চিতকরণ লিংক পাঠানো হয়েছে। ইমেইল যাচাই করার পরে লগইন করুন।
          </p>
          <Link href="/login" className="btn btn-primary mt-4" style={{ fontFamily: 'var(--font-bengali)', display: 'inline-flex' }}>
            লগইন পেজে যান
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', boxShadow: '0 0 40px var(--color-primary-glow)' }}>
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: 'var(--font-bengali)' }}>
            পারিবারিক বংশতালিকা
          </h1>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6" style={{ fontFamily: 'var(--font-bengali)' }}>
            নতুন অ্যাকাউন্ট তৈরি করুন
          </h2>

          {error && (
            <div className="alert alert-error mb-4" style={{ fontFamily: 'var(--font-bengali)' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="label" style={{ fontFamily: 'var(--font-bengali)' }}>আপনার নাম</label>
              <input
                type="text"
                className="input"
                placeholder="আপনার পুরো নাম"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                style={{ fontFamily: 'var(--font-bengali)' }}
              />
            </div>

            <div>
              <label className="label" style={{ fontFamily: 'var(--font-bengali)' }}>ইমেইল</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" style={{ fontFamily: 'var(--font-bengali)' }}>পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ fontFamily: 'var(--font-bengali)', width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? 'নিবন্ধন হচ্ছে...' : 'নিবন্ধন করুন'}
            </button>
          </form>

          <div className="divider" />

          <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)' }}>
            ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
            <Link href="/login" style={{ color: 'var(--color-primary-light)' }}>
              লগইন করুন
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
