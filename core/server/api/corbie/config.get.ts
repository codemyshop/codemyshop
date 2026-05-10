/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getCorbieConfig } from '~/internal/corbie/server/utils/corbie'

/**
 * GET /api/corbie/config
 * Returns the configuration of spaces and agents for the logged-in profile.
 * Source of truth: cs_corbie_config (DB)
 */
export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'corbie-session')
  if (!cookie) {
    throw createError({ statusCode: 401, message: 'Non autorisé' })
  }

  const row = await getCorbieConfig(cookie)
  if (!row) {
    return { owner: '', appName: 'Corbie', spaces: {} }
  }

  return {
    owner: row.owner,
    appName: 'Corbie',
    spaces: row.spaces ? JSON.parse(row.spaces) : {},
  }
})
