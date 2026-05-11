

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { createOrderFromCart, getOrderFromDb } from '~/server/utils/orders-db'
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from '~/server/utils/order-emails'
import { getCustomerSession, resolveCustomerIdForRequest } from '~/server/utils/customer-session'
import { attachActionToSession } from '~/internal/impersonation/server/utils/impersonation'
import { creditLoyaltyForOrder } from '~/server/utils/loyalty'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  const { cartId, customerId, addressDeliveryId, addressInvoiceId, carrierId, paymentMethod, clientId, customerEmail } = body || {}
  const resolvedCustomerId = resolveCustomerIdForRequest(event, customerId)

  if (!cartId || !resolvedCustomerId || !addressDeliveryId || !carrierId) {
    throw createError({ statusCode: 400, message: 'cartId, customerId, addressDeliveryId et carrierId requis' })
  }

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const created = await createOrderFromCart({
    cartId: Number(cartId),
    customerId: resolvedCustomerId,
    addressDeliveryId: Number(addressDeliveryId),
    addressInvoiceId: Number(addressInvoiceId || addressDeliveryId),
    carrierId: Number(carrierId),
    paymentMethod: String(paymentMethod || 'Virement bancaire'),
  }, ctx)
  if (!created) throw createError({ statusCode: 500, message: 'Impossible de créer la commande' })

  const order = await getOrderFromDb(created.id, ctx)
  if (!order) throw createError({ statusCode: 500, message: 'Commande créée mais introuvable' })

  const session = getCustomerSession(event)
  if (session?.isImpersonated && session.impersonationSessionId) {
    await attachActionToSession(session.impersonationSessionId, { idOrder: Number((order as any).id) }).catch(err => {
      console.error('[orders/create] impersonation audit failed:', err?.message || err)
    })
  }

  if (customerEmail) {
    const d = usePocPg()
    const shopRows: any[] = await d.execute(sql`SELECT value FROM cs_main.ps_configuration WHERE name='PS_SHOP_NAME' LIMIT 1`).catch(() => [] as any[]) as any[]
    const shopRow = shopRows?.[0]
    const shopName = shopRow?.value
      || (clientId ? `${String(clientId).charAt(0).toUpperCase()}${String(clientId).slice(1)}` : 'Boutique')

    
    
    
    
    const paymentLow = String(order.payment).toLowerCase()
    const isSystempay = paymentLow.includes('systempay') || paymentLow.includes('carte bancaire')
    const isBankwire = paymentLow.includes('virement')

    if (!isSystempay) {
      
      let bankDetails: { owner: string; details: string; address: string; customText: string } | undefined
      if (isBankwire) {
        const bankRows: any[] = await d.execute(sql`
          SELECT name, value FROM cs_main.ps_configuration
           WHERE name IN ('BANK_WIRE_OWNER','BANK_WIRE_DETAILS','BANK_WIRE_ADDRESS','BANK_WIRE_CUSTOM_TEXT')
        `).catch(() => [] as any[]) as Array<{ name: string; value: string | null }>
        const m: Record<string, string> = {}
        for (const r of bankRows) m[r.name] = String(r.value || '')
        bankDetails = {
          owner: m.BANK_WIRE_OWNER || '',
          details: m.BANK_WIRE_DETAILS || '',
          address: m.BANK_WIRE_ADDRESS || '',
          customText: m.BANK_WIRE_CUSTOM_TEXT || '',
        }
      }

      
      const carrierRow: any = await d.execute(sql`
        SELECT cl.name FROM cs_main.ps_carrier c
        LEFT JOIN cs_main.ps_carrier_lang cl
          ON cl.id_carrier = c.id_carrier AND cl.id_lang = 1
        WHERE c.id_carrier = ${Number(carrierId)} LIMIT 1
      `).catch(() => [] as any[])
      const carrierName = String((carrierRow?.[0]?.name) || '')

      const cfg = useRuntimeConfig()
      const baseUrl = String(cfg.public.psFrontUrl || '').replace(/\/$/, '')
      const historyUrl = `${baseUrl}/mon-compte/commandes/${(order as any).id}`

      sendOrderConfirmationEmail(
        order as any,
        String(customerEmail),
        shopName,
        '#4F46E5',
        bankDetails,
        { carrierName, historyUrl },
      ).catch(err => {
        console.error('[orders/create] Email send failed:', err)
      })
    } else {
      console.log(`[orders/create] SystemPay → email confirmation différé jusqu'à IPN success (order=#${(order as any).reference})`)
    }

    
    const addr = (order as any).addressDelivery
    const customerName = `${addr?.firstname || ''} ${addr?.lastname || ''}`.trim() || String(customerEmail)
    
    const custRows: any[] = await d.execute(sql`
      SELECT company FROM cs_main.ps_customer WHERE id_customer = ${resolvedCustomerId} LIMIT 1
    `).catch(() => [] as any[]) as any[]
    const company = String(custRows?.[0]?.company || addr?.company || '')
    sendAdminNewOrderEmail({
      orderRef:      String((order as any).reference),
      customerName,
      customerEmail: String(customerEmail),
      totalPaid:     Number((order as any).totalPaidTTC || 0),
      payment:       String((order as any).payment || ''),
      shopName,
      firstname:     String(addr?.firstname || ''),
      lastname:      String(addr?.lastname || ''),
      company,
      idOrder:       Number((order as any).id || 0),
    }).catch(err => {
      console.error('[orders/create] Admin notif failed:', err?.message || err)
    })
  }

  
  
  
  creditLoyaltyForOrder(Number((order as any).id)).catch(err => {
    console.error('[orders/create] Loyalty credit failed:', err?.message || err)
  })

  return order
})
