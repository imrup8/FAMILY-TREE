'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
export default function TreePage() {
  const [data, setData] = useState<{ nodes: { id: string; display_id: string; name_bengali: string; generation_number: number | null }[]; edges: { person_a_id: string; person_b_id: string; relationship_type: string }[] }>({ nodes: [], edges: [] })
  useEffect(() => { fetch('/api/tree').then(r => r.json()).then(setData) }, [])
  return <section><h1 className="text-2xl font-semibold mb-4">বংশবৃক্ষ</h1><p className="text-muted mb-4">সম্পর্কগুলো যাচাইকৃত উৎসসহ দেখুন।</p><div className="grid md:grid-cols-3 gap-3">{data.nodes.map(node => <Link className="card" href={`/dashboard/people/${node.id}`} key={node.id}><strong>{node.name_bengali}</strong><span className="block text-muted text-sm">প্রজন্ম {node.generation_number ?? 'অজানা'}</span></Link>)}</div></section>
}
