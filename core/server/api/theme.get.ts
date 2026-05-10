/**
 *
 * GET /api/theme
 *
 * Serves the theme of the current tenant from cs_theme (PG cs_main).
 * The getThemeForTenant facade dispatches to usePocPg() via isDomainOnPg.
 */
import { resolveClientId } from '~/server/utils/db'
import { getThemeForTenant } from '~/modules/theme/server/utils/theme'

export default defineEventHandler(async (event) => {
  const clientId = resolveClientId(event)
  try {
    const theme = await getThemeForTenant(clientId, { event })
    return { theme }
  } catch (err: any) {
    console.error('[theme] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur chargement thème' })
  }
})
