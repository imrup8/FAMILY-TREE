'use client'
import { useEffect, useState } from 'react'
type DocumentRow = { id: string; display_id: string; title: string; status: string; created_at: string }
export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  useEffect(() => { fetch('/api/documents').then(r => r.json()).then(d => setDocuments(d.data ?? [])) }, [])
  return <section><h1 className="text-2xl font-semibold mb-4">নথি আর্কাইভ</h1><div className="space-y-3">{documents.map(document => <div className="card flex justify-between" key={document.id}><span>{document.title}<small className="block text-muted">{document.display_id}</small></span><span>{document.status}</span></div>)}</div></section>
}
