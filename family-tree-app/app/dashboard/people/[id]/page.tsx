'use client'
import { useEffect, useState } from 'react'
import type { Person, PersonWithRelatives } from '@/types'

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const [person, setPerson] = useState<PersonWithRelatives | null>(null)
  useEffect(() => { params.then(({ id }) => fetch(`/api/people/${id}`).then(r => r.json()).then(setPerson)) }, [params])
  if (!person) return <p>লোড হচ্ছে...</p>
  return <section><h1 className="text-2xl font-semibold">{person.name_bengali}</h1><p className="text-muted">{person.name_transliterated ?? '—'} · {person.verification_status}</p><div className="grid md:grid-cols-3 gap-4 mt-6">{[['পিতা/মাতা', person.parents], ['সন্তান', person.children], ['দাম্পত্য', person.spouses]].map(([label, relatives]) => <div className="card" key={String(label)}><h2 className="font-semibold mb-2">{label as string}</h2>{(relatives as Person[]).map(relative => <p key={relative.id}>{relative.name_bengali}</p>)}</div>)}</div></section>
}
