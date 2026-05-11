

import { getFeatureIdByRoute } from '~/modules/marketplace/server/utils/marketplace'
import { findPlaybookByFeatureRole } from '~/modules/playbook/server/utils/playbook'

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
