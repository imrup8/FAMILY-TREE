'use client'
export default function ExportPage() {
  return <section><h1 className="text-2xl font-semibold mb-4">ডেটা এক্সপোর্ট</h1><div className="card flex gap-3 flex-wrap">{['json', 'csv', 'gedcom'].map(format => <a className="button" href={`/api/export?format=${format}`} download key={format}>{format.toUpperCase()} ডাউনলোড</a>)}</div></section>
}
