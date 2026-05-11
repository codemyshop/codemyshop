

import { listPlaybooks } from '~/modules/playbook/server/utils/playbook'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const role = (q.role || '').toUpperCase().trim() || undefined
  const status = q.status || 'published'

  try {
    const playbooks = await listPlaybooks({ role, status }, { event })
    return { playbooks, total: playbooks.length }
  } catch (err: any) {
    console.error('[bo/playbooks] DB error:', err?.message)
    return { playbooks: [], total: 0 }
  }
})
