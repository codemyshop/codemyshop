/**
 *
 * POST /api/admin/provision
 * Triggers the provisioning of a new CodeMyShop client.
 * Reserved for authenticated administrators.
 */
import { provisionClient } from '~/server/services/infrastructure'
import type { ProvisionRequest } from '~/server/services/infrastructure'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  // Vérification admin (cookie hub_session, signé HMAC backlog #249)
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }
  if (!session.isAdmin) {
    throw createError({ statusCode: 403, message: 'Accès réservé aux administrateurs' })
  }

  const body = await readBody<ProvisionRequest>(event)

  if (!body.clientId || !body.clientName || !body.offer || !body.domain || !body.email) {
    throw createError({ statusCode: 400, message: 'Champs requis : clientId, clientName, offer, domain, email' })
  }

  if (!['starter', 'premium'].includes(body.offer)) {
    throw createError({ statusCode: 400, message: 'offer doit être "starter" ou "premium"' })
  }

  console.log(`[provision] Démarrage provisioning ${body.offer} — client: ${body.clientId}, domain: ${body.domain}`)

  const result = await provisionClient(body)

  if (!result.success) {
    console.error(`[provision] Échec : ${result.error}`)
  } else {
    console.log(`[provision] ✓ Client ${body.clientId} provisionné (${body.offer})`)
  }

  return result
})
