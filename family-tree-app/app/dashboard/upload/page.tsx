'use client'
import { useState } from 'react'
export default function UploadPage() {
  const [message, setMessage] = useState('')
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await fetch('/api/documents', { method: 'POST', body: form }); const data = await response.json(); setMessage(data.message ?? data.error ?? 'সম্পন্ন') }
  return <section><h1 className="text-2xl font-semibold mb-4">নথি আপলোড</h1><form className="card space-y-4 max-w-xl" onSubmit={submit}><input className="input" name="title" placeholder="নথির শিরোনাম" required /><textarea className="input" name="description" placeholder="বিবরণ" /><input className="input" name="files" type="file" accept="image/*,application/pdf" multiple required /><button className="button" type="submit">আপলোড ও বিশ্লেষণের জন্য কিউ করুন</button>{message && <p>{message}</p>}</form></section>
}
