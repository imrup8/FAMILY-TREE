'use client'
import { useEffect, useState } from 'react'
type ReviewItem = { id: string; item_type: string; proposed_data: { name_original_script?: string; gender?: string }; confidence_score: number | null }
export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const load = () => fetch('/api/review').then(r => r.json()).then(d => setItems(d.data ?? []))
  useEffect(() => { void load() }, [])
  async function act(id: string, action: 'approve' | 'reject' | 'defer') { await fetch(`/api/review/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) }); load() }
  return <section><h1 className="text-2xl font-semibold mb-4">AI পর্যালোচনা</h1><div className="space-y-3">{items.map(item => <article className="card flex items-center justify-between gap-4" key={item.id}><div><strong>{item.proposed_data.name_original_script ?? item.item_type}</strong><p className="text-muted text-sm">আস্থা: {item.confidence_score == null ? '—' : `${Math.round(item.confidence_score * 100)}%`}</p></div><div className="flex gap-2"><button className="button" onClick={() => act(item.id, 'approve')}>অনুমোদন</button><button className="button-secondary" onClick={() => act(item.id, 'defer')}>পরে</button><button className="button-danger" onClick={() => act(item.id, 'reject')}>বাতিল</button></div></article>)}</div></section>
}
