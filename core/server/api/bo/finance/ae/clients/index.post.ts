/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { createAeClient } from '~/internal/aetracker/server/utils/aetracker'

/**
 * POST /api/bo/finance/ae/clients — Creates a recurring or one-time client.
 *
 * Body : { label, monthlyHt, startDate, endDate?, status?, clientKind?, notes? }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.label || typeof body.label !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'label required' })
  }
  if (typeof body.monthlyHt !== 'number' || body.monthlyHt < 0) {
    throw createError({ statusCode: 400, statusMessage: 'monthlyHt required (>= 0)' })
  }
  if (!body.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
    throw createError({ statusCode: 400, statusMessage: 'startDate required (YYYY-MM-DD)' })
  }

  try {
    const id = await createAeClient(
      {
        label: body.label.trim(),
        monthlyHt: Number(body.monthlyHt),
        startDate: body.startDate,
        endDate: body.endDate || null,
        status: body.status || 'active',
        clientKind: body.clientKind || 'recurring',
        notes: body.notes || null,
      },
      { event },
    )
    return { id, ok: true }
  } catch (err: any) {
    console.error('[bo/finance/ae/clients POST] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: err?.message || 'insert failed' })
  }
})
