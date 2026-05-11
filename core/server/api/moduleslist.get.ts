

import { listActiveModuleslistPg } from '~/server/utils/step7-readonly-pg'

function parseJson<T>(raw: any, fb: T): T {
  if (raw == null || raw === '') return fb
  try { return JSON.parse(String(raw)) as T } catch { return fb }
}

export default defineEventHandler(async () => {
  const rows = await listActiveModuleslistPg()

  const modules = rows.map((r: any) => ({
    name: String(r.name || ''),
    codename: String(r.codename || ''),
    icon: String(r.icon || ''),
    category: String(r.category || 'general'),
    flywheel: String(r.flywheel || ''),
    description: String(r.description || ''),
    features: parseJson<any[]>(r.features, []),
    tags: parseJson<any[]>(r.tags, []),
    status: String(r.status || 'Production'),
    link: String(r.link || ''),
  }))
  return { modules }
})
