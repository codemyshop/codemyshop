

import { verifySiret } from '~/server/utils/siret-verify'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const raw = String(q.siret ?? '').trim()
  if (!raw) {
    return { valid: false, error: 'SIRET manquant.' }
  }
  return await verifySiret(raw)
})
