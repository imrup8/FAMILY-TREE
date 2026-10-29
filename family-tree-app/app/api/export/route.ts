import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const params = new URL(request.url).searchParams
  const format = params.get('format') ?? 'json'
  const includeLiving = params.get('include_living') !== 'false'
  const [{ data: people }, { data: relationships }] = await Promise.all([
    supabaseAdmin.from('people').select('*').is('deleted_at', null).limit(10000),
    supabaseAdmin.from('relationships').select('*').is('deleted_at', null).limit(20000),
  ])
  const safePeople = (people ?? []).filter(person => includeLiving || !person.is_living)
  if (format === 'json') return NextResponse.json({ people: safePeople, relationships: relationships ?? [] })
  if (format === 'csv') {
    const headers = ['display_id', 'name_bengali', 'name_transliterated', 'gender', 'birth_date', 'death_date', 'verification_status']
    const body = [headers, ...safePeople.map(person => headers.map(header => person[header]))].map(row => row.map(csvEscape).join(',')).join('\r\n')
    return new NextResponse(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="family-tree-people.csv"' } })
  }
  if (format === 'gedcom') {
    const lines = ['0 HEAD', '1 SOUR FAMILY-TREE', '1 CHAR UTF-8']
    for (const person of safePeople) {
      lines.push(`0 @${person.display_id}@ INDI`, `1 NAME ${person.name_bengali}`)
      if (person.birth_date) lines.push('1 BIRT', `2 DATE ${person.birth_date}`)
      if (person.death_date) lines.push('1 DEAT', `2 DATE ${person.death_date}`)
    }
    lines.push('0 TRLR')
    return new NextResponse(lines.join('\r\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="family-tree.ged"' } })
  }
  return NextResponse.json({ error: 'format must be json, csv, or gedcom' }, { status: 400 })
}
