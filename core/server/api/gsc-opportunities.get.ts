

import { getTopOpportunities, getDecliningPages } from '~/server/services/gsc'
import { resolveClientId } from '~/server/utils/db'
import { getClientConfigJson } from '~/internal/clientconfig/server/utils/clientconfig'

async function resolveTenantSiteUrl(event: any): Promise<string> {
  try {
    const clientId = resolveClientId(event)
    const json = await getClientConfigJson(clientId, { event })
    if (!json) return ''
    const config = JSON.parse(json)
    return typeof config?.gscSiteUrl === 'string' ? config.gscSiteUrl : ''
  } catch {
    return ''
  }
}

export default defineEventHandler(async (event) => {
  try {
    const siteUrl = await resolveTenantSiteUrl(event)
    if (!siteUrl) {
      return {
        success: false,
        error: 'gscSiteUrl non configuré pour ce tenant',
        opportunities: [],
        declining: [],
      }
    }

    const [opportunities, declining] = await Promise.all([
      getTopOpportunities(siteUrl),
      getDecliningPages(siteUrl),
    ])

    return {
      success: true,
      siteUrl,
      opportunities,
      declining,
      fetchedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    console.warn('[gsc-opportunities] Error:', err?.message)
    return {
      success: false,
      error: err?.message || 'GSC indisponible',
      opportunities: [],
      declining: [],
    }
  }
})
