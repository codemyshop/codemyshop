/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/orders/:id/resend-payment-pending
 *
 * Manual resend of bank account details to customer. Reuses the tenant's bank account information
 * (ps_configuration BANK_WIRE_*) and sends the `order_payment_pending` template
 * via `sendPaymentPendingEmail` (DB-first + fallback HTML inline).
 *
 * Use cases :
 * - Back-office button 'Resend bank details' on order sheet
 * - Auto-resend cron for unpaid wire transfer orders after N days
 *
 * Note: order confirmation already contains bank details inline (checkout UX
 * ideal — 1 email), this endpoint serves later resends.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { sendPaymentPendingEmail } from '~/server/utils/order-emails'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const orderId = Number(id)

  const d = usePocPg()

  const ctxRows: any[] = await d.execute(sql`
    SELECT o.reference, c.email, c.firstname,
           cfg.value AS shop_name
      FROM cs_main.ps_orders o
      JOIN cs_main.ps_customer c ON c.id_customer = o.id_customer
      LEFT JOIN cs_main.ps_configuration cfg ON cfg.name = 'PS_SHOP_NAME'
     WHERE o.id_order = ${orderId}
     LIMIT 1
  `) as any[]
  const ctx = ctxRows[0]
  if (!ctx) throw createError({ statusCode: 404, message: 'Commande introuvable' })
  if (!ctx.email) throw createError({ statusCode: 422, message: 'Email client absent' })

  const ribRows: any[] = await d.execute(sql`
    SELECT name, value FROM cs_main.ps_configuration
     WHERE name IN ('BANK_WIRE_OWNER', 'BANK_WIRE_DETAILS', 'BANK_WIRE_ADDRESS')
  `) as any[]
  const rib: Record<string, string> = {}
  for (const r of ribRows) rib[String(r.name)] = String(r.value || '')

  const result = await sendPaymentPendingEmail(
    String(ctx.email),
    String(ctx.firstname || ''),
    String(ctx.reference),
    {
      owner:   rib.BANK_WIRE_OWNER   || undefined,
      details: rib.BANK_WIRE_DETAILS || undefined,
      address: rib.BANK_WIRE_ADDRESS || undefined,
    },
    String(ctx.shop_name || 'Boutique'),
  )

  return { success: true, queued: result }
})
