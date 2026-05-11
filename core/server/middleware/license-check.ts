

import { getLicenseStatus } from '~/server/licensing/heartbeat'

export default defineEventHandler((event) => {
  const url = getRequestURL(event).pathname

  
  if (!url.startsWith('/hub') && !url.startsWith('/api/hub')) return

  
  if (url.includes('/_nuxt/') || url.includes('/favicon')) return

  const status = getLicenseStatus()

  if (status === 'expired') {
    
    if (url.startsWith('/api/')) {
      throw createError({
        statusCode: 403,
        message: 'Licence CodeMyShop expirée. Contactez support@codemyshop.com',
      })
    }
    
  }

  
  if (status === 'grace') {
    console.warn(`[license] Instance en période de grâce — renouveler la licence.`)
  }
})
