/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import {
  findUrssafDeclarationByPeriod,
  getUrssafSummaryForPeriod,
  markUrssafDeclared,
  markUrssafPaid,
  markUrssafUndeclared,
  markUrssafUnpaid,
} from '~/enterprise/banking/urssaf/server/utils/urssaf'

/**
 * PATCH /api/bo/invoices/urssaf — marks a URSSAF declaration as paid/filed or clears the status.
 *
 * Body : { periodMonth: 'YYYY-MM', action: 'mark_paid' | 'mark_unpaid' | 'mark_declared' | 'mark_undeclared', receiptPath?: string }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ periodMonth: string; action: string; receiptPath?: string }>(event)
  const { periodMonth, action, receiptPath } = body || {}

  if (!periodMonth || !/^\d{4}-\d{2}$/.test(periodMonth)) {
    throw createError({ statusCode: 400, message: 'periodMonth (YYYY-MM) requis' })
  }

  const existing = await findUrssafDeclarationByPeriod(periodMonth, { event })
  if (!existing) throw createError({ statusCode: 404, message: `Déclaration ${periodMonth} introuvable` })

  switch (action) {
    case 'mark_paid':
      await markUrssafPaid(periodMonth, receiptPath || null, { event })
      break
    case 'mark_unpaid':
      await markUrssafUnpaid(periodMonth, { event })
      break
    case 'mark_declared':
      await markUrssafDeclared(periodMonth, { event })
      break
    case 'mark_undeclared':
      await markUrssafUndeclared(periodMonth, { event })
      break
    default:
      throw createError({ statusCode: 400, message: `action inconnue : ${action}` })
  }

  const declaration = await getUrssafSummaryForPeriod(periodMonth, { event })
  return { ok: true, declaration }
})
