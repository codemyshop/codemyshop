

import { createHmac, createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { useClientDb } from '~/server/utils/db'
import { usePocPg } from '~/server/db/drizzle-pg'
import { getOrderFromDb } from '~/server/utils/orders-db'
import { sendOrderConfirmationEmail } from '~/server/utils/order-emails'
import { creditLoyaltyForOrder } from '~/server/utils/loyalty'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, string>>(event)

  const env = process.env
  const db = useClientDb(event)

  const dbMode = await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'SYSTEMPAY_MODE' LIMIT 1`,
  ).catch(() => null)
  const mode = (dbMode?.value || env.SYSTEMPAY_MODE || 'TEST').toUpperCase()
  const key = mode === 'TEST' ? (env.SYSTEMPAY_TEST_KEY || '') : (env.SYSTEMPAY_PROD_KEY || '')

  
  const receivedSig = body.signature
  if (!receivedSig) {
    console.error('[systempay-ipn] Pas de signature dans la notification')
    throw createError({ statusCode: 401, message: 'Missing signature' })
  }

  
  const signAlgo = (env.SYSTEMPAY_SIGN_ALGO || 'sha256_hmac').toLowerCase()
  const sortedKeys = Object.keys(body).filter(k => k.startsWith('vads_')).sort()
  const payload = sortedKeys.map(k => body[k]).join('+')
  const expectedSig = signAlgo === 'sha1'
    ? createHash('sha1').update(payload + '+' + key).digest('hex')
    : createHmac('sha256', key).update(payload).digest('base64')

  if (receivedSig !== expectedSig) {
    console.error(`[systempay-ipn] Signature invalide pour order=${body.vads_order_id} (mode=${mode})`)
    throw createError({ statusCode: 401, message: 'Invalid signature' })
  }

  
  if (body.vads_ctx_mode && body.vads_ctx_mode !== mode) {
    console.error(`[systempay-ipn] Mode mismatch : notif=${body.vads_ctx_mode} instance=${mode}`)
    throw createError({ statusCode: 400, message: 'Mode mismatch' })
  }

  const orderRef = body.vads_order_id
  const orderId = Number(body.vads_ext_info_order_id)
  const transStatus = body.vads_trans_status
  const amountCents = Number(body.vads_amount || 0)

  console.log(`[systempay-ipn] order=${orderRef} id=${orderId} status=${transStatus} amount=${amountCents}c mode=${mode}`)

  
  const statusMap: Record<string, number> = {
    AUTHORISED: 2,
    CAPTURED: 2,
    REFUSED: 8,
    CANCELLED: 6,
    ABANDONED: 6,
    EXPIRED: 8,
  }
  const newState = statusMap[transStatus]

  if (!newState || !orderId) {
    
    return { status: 'ignored', reason: 'Status non mappé ou order_id manquant' }
  }

  
  const order = await db.get<{ id_order: number; total_paid: string; current_state: number }>(
    `SELECT id_order, total_paid, current_state FROM ps_orders WHERE id_order = ? LIMIT 1`,
    [orderId],
  )
  if (!order) {
    console.error(`[systempay-ipn] Commande #${orderId} (${orderRef}) introuvable`)
    throw createError({ statusCode: 404, message: 'Order not found' })
  }

  
  
  if (newState === 2) {
    const expectedCents = Math.round(Number(order.total_paid || 0) * 100)
    if (Math.abs(expectedCents - amountCents) > 1) {
      console.error(`[systempay-ipn] Montant mismatch : reçu=${amountCents}c attendu=${expectedCents}c order=#${orderId}`)
      throw createError({ statusCode: 400, message: 'Amount mismatch' })
    }
  }

  
  if (Number(order.current_state) === newState) {
    console.log(`[systempay-ipn] Order #${orderId} déjà au state ${newState} — skip`)
    return { status: 'ok', reason: 'already at target state' }
  }

  
  try {
    const { affectedRows } = await db.run(
      `UPDATE ps_orders SET current_state = ?, date_upd = NOW() WHERE id_order = ?`,
      [newState, orderId],
    )
    if (affectedRows) {
      await db.run(
        `INSERT INTO ps_order_history (id_employee, id_order, id_order_state, date_add)
         VALUES (0, ?, ?, NOW())`,
        [orderId, newState],
      )
      console.log(`[systempay-ipn] Order #${orderId} (${orderRef}) → state ${newState} (${transStatus})`)
    }
  } catch (err: any) {
    console.error(`[systempay-ipn] Erreur MAJ commande ${orderRef}:`, err?.message)
    throw createError({ statusCode: 500, message: 'DB error' })
  }

  
  
  if (newState === 2) {
    creditLoyaltyForOrder(orderId).catch((err: any) => {
      console.error(`[systempay-ipn] Loyalty credit failed for order ${orderId}:`, err?.message || err)
    })
  }

  
  
  
  if (newState === 2) {
    try {
      const fullOrder = await getOrderFromDb(orderId, { event })
      const custEmail = body.vads_cust_email || ''
      if (fullOrder && custEmail) {
        const d = usePocPg()
        const shopRows: any[] = await d.execute(sql`SELECT value FROM cs_main.ps_configuration WHERE name='PS_SHOP_NAME' LIMIT 1`).catch(() => [] as any[]) as any[]
        const shopName = shopRows?.[0]?.value || 'Boutique'

        const carrierRow: any = await d.execute(sql`
          SELECT cl.name FROM cs_main.ps_carrier c
          LEFT JOIN cs_main.ps_carrier_lang cl
            ON cl.id_carrier = c.id_carrier AND cl.id_lang = 1
          WHERE c.id_carrier = (SELECT id_carrier FROM cs_main.ps_orders WHERE id_order = ${orderId})
          LIMIT 1
        `).catch(() => [] as any[])
        const carrierName = String(carrierRow?.[0]?.name || '')

        const cfg = useRuntimeConfig()
        const baseUrl = String(cfg.public.psFrontUrl || '').replace(/\/$/, '')
        const historyUrl = `${baseUrl}/mon-compte/commandes/${orderId}`

        sendOrderConfirmationEmail(
          fullOrder as any,
          custEmail,
          shopName,
          '#4F46E5',
          undefined,
          { carrierName, historyUrl, attachInvoiceForOrderId: orderId },
        ).catch(err => console.error('[systempay-ipn] Email confirmation failed:', err?.message || err))
      }
    } catch (err: any) {
      
      
      console.error('[systempay-ipn] Erreur préparation email confirmation:', err?.message)
    }
  }

  return { status: 'ok', orderId, newState, transStatus }
})
