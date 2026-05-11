

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

function parseJson<T>(raw: any, fb: T): T {
  if (raw == null || raw === '') return fb
  try { return JSON.parse(String(raw)) as T } catch { return fb }
}

export default defineEventHandler(async () => {
  const rows: any[] = await usePocPg().execute(sql`
    SELECT * FROM cs_main.cs_tools WHERE active = 1 ORDER BY position ASC
  `) as any[]
  const tools = (rows ?? []).map((r: any) => ({
    name: String(r.name || ''),
    codename: String(r.codename || ''),
    icon: String(r.icon || ''),
    flywheel: String(r.flywheel || ''),
    category: String(r.category || 'general'),
    description: String(r.description || ''),
    results: parseJson<any[]>(r.results, []),
    tags: parseJson<any[]>(r.tags, []),
    status: String(r.status || 'Production'),
  }))
  return { tools }
})
