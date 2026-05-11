

import { createHmac, createHash } from 'node:crypto'
import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { orderId, orderReference, amount, customerEmail } = body

  if (!orderId || !orderReference || !amount) {
    throw createError({ statusCode: 400, message: 'orderId, orderReference et amount requis' })
  }

  const env = process.env
  const shopId = env.SYSTEMPAY_ID_SHOP || ''

  
  
  const db = useClientDb(event)
  const dbMode = await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'SYSTEMPAY_MODE' LIMIT 1`,
  ).catch(() => null)
  const mode = (dbMode?.value || env.SYSTEMPAY_MODE || 'TEST').toUpperCase()

  const key = mode === 'TEST' ? (env.SYSTEMPAY_TEST_KEY || '') : (env.SYSTEMPAY_PROD_KEY || '')
  const paymentUrl = env.SYSTEMPAY_PROD_URL || 'https://paiement.systempay.fr/vads-payment/'

  const config = useRuntimeConfig()
  const baseUrl = (config.public.psFrontUrl as string || '').replace(/\/$/, '')

  if (!shopId || !key) {
    throw createError({ statusCode: 500, message: 'Configuration SystemPay manquante' })
  }

  
  const now = new Date()
  const transId = String(now.getTime() % 900000 + 100000)

  
  const transDate = now.toISOString().replace(/[-:T]/g, '').slice(0, 14)

  
  const amountCents = Math.round(amount * 100)

  const fields: Record<string, string> = {
    vads_site_id: shopId,
    vads_ctx_mode: mode,
    vads_trans_id: transId,
    vads_trans_date: transDate,
    vads_amount: String(amountCents),
    vads_currency: '978', 
    vads_action_mode: 'INTERACTIVE',
    vads_page_action: 'PAYMENT',
    vads_version: 'V2',
    vads_payment_config: 'SINGLE',
    vads_order_id: orderReference,
    vads_url_return: `${baseUrl}/paiement/retour`,
    vads_url_check: `${baseUrl}/api/payment/systempay-ipn`,
    vads_return_mode: 'GET',
    vads_hash: 'sha256_hmac',
  }

  if (customerEmail) {
    fields.vads_cust_email = customerEmail
  }

  fields.vads_ext_info_order_id = String(orderId)

  
  
  
  
  const signAlgo = (env.SYSTEMPAY_SIGN_ALGO || 'sha256_hmac').toLowerCase()
  if (signAlgo === 'sha1') {
    delete (fields as any).vads_hash 
  }
  const sortedKeys = Object.keys(fields).filter(k => k.startsWith('vads_')).sort()
  const payload = sortedKeys.map(k => fields[k]).join('+')
  const signature = signAlgo === 'sha1'
    ? createHash('sha1').update(payload + '+' + key).digest('hex')
    : createHmac('sha256', key).update(payload).digest('base64')

  fields.signature = signature

  console.log(`[systempay] Form generated: order=${orderReference} amount=${amountCents}c mode=${mode} transId=${transId}`)

  return {
    url: paymentUrl,
    fields,
  }
})
