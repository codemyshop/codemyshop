

import { listOpenSlots } from '~/enterprise/base/appointment/server/utils/appointment'

export default defineEventHandler(async (event) => {
  try {
    const slots = await listOpenSlots({ event })
    return { success: true, slots }
  }
  catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur DB inconnue'
    console.error('[appointment/slots] SELECT failed:', msg)
    throw createError({
      statusCode: 503,
      statusMessage: 'Service temporairement indisponible',
      data: { code: 'SERVICE_UNAVAILABLE' },
    })
  }
})
