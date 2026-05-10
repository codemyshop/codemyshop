/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getFeatureIdByRoute } from '~/modules/marketplace/server/utils/marketplace'
import { findPlaybookByFeatureRole } from '~/modules/playbook/server/utils/playbook'

/**
 * GET /api/bo/playbooks/by-route?path=/hub/logistique/tournees[&role=SALES]
 * Resolves the feature linked to the route (via the marketplace service) then returns the
 * published playbook corresponding via the playbook service. If `role` is provided,
 * limits to playbooks accessible to the role. Returns { playbook: null } if
 * nothing found (not a 404).
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const path = (q.path || '').trim()
  const role = (q.role || '').toUpperCase().trim() || null
  if (!path) return { playbook: null }

  try {
    const featureId = await getFeatureIdByRoute(path, { event })
    if (!featureId) return { playbook: null }

    const playbook = await findPlaybookByFeatureRole(featureId, role, { event })
    return { playbook: playbook || null, featureId }
  } catch (err: any) {
    console.error('[bo/playbooks/by-route] error', err?.message)
    return { playbook: null }
  }
})
