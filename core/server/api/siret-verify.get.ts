/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { verifySiret } from '~/server/utils/siret-verify'

/**
 * GET /api/siret-verify?siret=12345678901234
 *
 * Lightweight public wrapper over verifySiret() (recherche-entreprises.api.gouv.fr).
 * Used by the /rdv form when b2bMode=true to pre-fill the company.
 *
 * Response: { valid, siret?, siren?, companyName?, legalForm?, city?, error? }
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const raw = String(q.siret ?? '').trim()
  if (!raw) {
    return { valid: false, error: 'SIRET manquant.' }
  }
  return await verifySiret(raw)
})
