/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listPlaybooks } from '~/modules/playbook/server/utils/playbook'

/**
 * GET /api/bo/playbooks — list of playbooks via the playbook service.
 * Query: ?role=SALES (filter by role, optional) &status=published (default)
 * FOUNDER/ROOT without ?role → all playbooks.
 */
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
