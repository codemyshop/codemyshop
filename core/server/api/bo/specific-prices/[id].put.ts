/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * PUT /api/bo/specific-prices/:id — edits an existing promotion.
 * Champs modifiables : reduction, reductionType, reductionTax, fromQuantity,
 * idGroup, dateFrom, dateTo. id_product non modifiable (delete + recreate
 * if we want to change the target).
 */
import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'

const FROM_SENTINEL = '1970-01-01 00:00:00'
const TO_SENTINEL   = '9999-12-31 23:59:59'

interface Body {
  reduction?: number
  reductionType?: 'percentage' | 'amount'
  reductionTax?: 0 | 1
  fromQuantity?: number
  idGroup?: number
  dateFrom?: string | null
  dateTo?: string | null
}

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'id invalide' })
  }
  const body = await readBody<Body>(event)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'body manquant' })

  const sets: string[] = []
  const params: any[] = []

  if (body.reduction !== undefined) {
    if (!Number.isFinite(body.reduction) || body.reduction <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'reduction doit être > 0' })
    }
    sets.push('reduction = ?')
    params.push(body.reduction)
  }
  if (body.reductionType !== undefined) {
    if (body.reductionType !== 'percentage' && body.reductionType !== 'amount') {
      throw createError({ statusCode: 400, statusMessage: 'reductionType invalide' })
    }
    sets.push('reduction_type = ?')
    params.push(body.reductionType)
  }
  if (body.reductionTax !== undefined) {
    sets.push('reduction_tax = ?')
    params.push(body.reductionTax === 0 ? 0 : 1)
  }
  if (body.fromQuantity !== undefined) {
    sets.push('from_quantity = ?')
    params.push(Math.max(Number(body.fromQuantity) || 1, 1))
  }
  if (body.idGroup !== undefined) {
    sets.push('id_group = ?')
    params.push(Math.max(Number(body.idGroup) || 0, 0))
  }
  if (body.dateFrom !== undefined) {
    sets.push('`from` = ?')
    params.push(body.dateFrom ?? FROM_SENTINEL)
  }
  if (body.dateTo !== undefined) {
    sets.push('`to` = ?')
    params.push(body.dateTo ?? TO_SENTINEL)
  }

  if (!sets.length) throw createError({ statusCode: 400, statusMessage: 'Aucun champ à mettre à jour' })

  const db = useClientDb(event)
  params.push(id)
  const res = await db.run(
    `UPDATE ps_specific_price SET ${sets.join(', ')} WHERE id_specific_price = ?`,
    params,
  )
  if (!res.affectedRows) {
    throw createError({ statusCode: 404, statusMessage: 'Promotion introuvable' })
  }
  return { ok: true, id }
})
