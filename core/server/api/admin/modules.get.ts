

import { resolveClientId } from '~/server/utils/db'
import { listAllManifests, isModuleActive } from '~/server/utils/module-loader'
import { resolveTenantInfo } from '~/server/utils/tier-resolver'
import { listRegisteredHooks } from '~/server/utils/hooks-bus'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const clientId = resolveClientId(event)
  const tenantInfo = await resolveTenantInfo(clientId)
  const manifests = listAllManifests()
  const hooks = listRegisteredHooks()

  return {
    tenant: {
      clientId,
      tier: tenantInfo.tier,
      isInternal: tenantInfo.isInternalTenant,
      marketplaceAddons: tenantInfo.marketplaceAddons,
    },
    modules: manifests.map((m) => ({
      id: m.id,
      edition: m.edition,
      pack: m.pack ?? null,
      requires: m.requires ?? [],
      active: isModuleActive(m, {
        tenantId: clientId,
        tier: tenantInfo.tier,
        marketplaceAddons: tenantInfo.marketplaceAddons,
        isInternalTenant: tenantInfo.isInternalTenant,
      }),
      pricing: m.pricing ?? null,
      hooksExposed: m.hooks?.exposes ?? [],
      hooksConsumed: m.hooks?.consumes ?? [],
    })),
    hooks,
  }
})
