/**
 *
 * Nitro middleware: checks the license on each request to /hub/*.
 * If the license is expired → returns a 403 with redirect to /suspended.
 */
import { getLicenseStatus } from '~/server/licensing/heartbeat'

export default defineEventHandler((event) => {
  const url = getRequestURL(event).pathname

  // Ne vérifier que les pages Hub et les API Hub
  if (!url.startsWith('/hub') && !url.startsWith('/api/hub')) return

  // Ignorer les assets statiques
  if (url.includes('/_nuxt/') || url.includes('/favicon')) return

  const status = getLicenseStatus()

  if (status === 'expired') {
    // Pour les API : retourner 403
    if (url.startsWith('/api/')) {
      throw createError({
        statusCode: 403,
        message: 'Licence CodeMyShop expirée. Contactez support@codemyshop.com',
      })
    }
    // Pour les pages : la logique de redirection est côté client (middleware Nuxt)
  }

  // Grace period : logger un warning
  if (status === 'grace') {
    console.warn(`[license] Instance en période de grâce — renouveler la licence.`)
  }
})
