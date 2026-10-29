'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Person } from '@/types'

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [query, setQuery] = useState('')
  useEffect(() => { fetch(`/api/people?q=${encodeURIComponent(query)}`).then(r => r.json()).then(d => setPeople(d.data ?? [])) }, [query])
  return <section><h1 className="text-2xl font-semibold mb-4">ব্যক্তি তালিকা</h1><input className="input mb-4" placeholder="বাংলা বা ইংরেজিতে খুঁজুন" value={query} onChange={e => setQuery(e.target.value)} /><div className="card"><table className="w-full"><thead><tr><th className="text-left">নাম</th><th className="text-left">লিঙ্গ</th><th className="text-left">যাচাই</th></tr></thead><tbody>{people.map(person => <tr key={person.id}><td><Link href={`/dashboard/people/${person.id}`}>{person.name_bengali}</Link></td><td>{person.gender}</td><td>{person.verification_status}</td></tr>)}</tbody></table></div></section>
}
