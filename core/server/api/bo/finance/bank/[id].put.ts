/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { updateBankTransaction } from '~/enterprise/banking/bank/server/utils/bank'

/**
 * PUT /api/bo/finance/bank/:id — Categorizes / reconciles a transaction.
 *
 * Body :
 *   - category?: string  (ex: "charges", "ventes", "tjm", "urssaf", "perso")
 *   - reconciled?: boolean
 *   - reconciledRef?: string
 *   - notes?: string
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id manquant' })

  const body = await readBody<{
    category?: string
    reconciled?: boolean
    reconciledRef?: string
    notes?: string
  }>(event)

  const patch: Record<string, any> = {}
  if (typeof body.category === 'string') patch.category = body.category.slice(0, 64) || null
  if (typeof body.reconciled === 'boolean') patch.reconciled = body.reconciled ? 1 : 0
  if (typeof body.reconciledRef === 'string') patch.reconciledRef = body.reconciledRef.slice(0, 128) || null
  if (typeof body.notes === 'string') patch.notes = body.notes || null

  if (!Object.keys(patch).length) return { ok: false, error: 'aucun champ modifié' }

  try {
    await updateBankTransaction(id, patch, { event })
    return { ok: true, id }
  } catch (err: any) {
    console.error('[bo/finance/bank PUT] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  }
})
