

import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const webhookSecret = config.stripeWebhookSecret as string

  if (!webhookSecret) {
    throw createError({ statusCode: 500, message: '[stripe] STRIPE_WEBHOOK_SECRET non configuré' })
  }

  
  const rawBody = await readRawBody(event)
  const sig = getHeader(event, 'stripe-signature')

  if (!rawBody || !sig) {
    throw createError({ statusCode: 400, message: 'Missing body or stripe-signature' })
  }

  let stripeEvent: Stripe.Event
  try {
    const stripe = useStripe()
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: any) {
    console.error('[stripe-webhook] Signature invalide:', err?.message)
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  
  const type = stripeEvent.type

  switch (type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      const clientName = session.metadata?.client_name ?? session.client_reference_id ?? 'unknown'
      const email = session.customer_email ?? ''
      console.log(`[stripe-webhook] ✅ Checkout completed — client: ${clientName}, email: ${email}`)
      
      break
    }

    case 'invoice.paid': {
      const invoice = stripeEvent.data.object as Stripe.Invoice
      console.log(`[stripe-webhook] 💰 Invoice paid — ${invoice.customer_email}, amount: ${(invoice.amount_paid / 100).toFixed(2)}€`)
      
      break
    }

    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object as Stripe.Invoice
      console.error(`[stripe-webhook] ⚠️ Payment failed — ${invoice.customer_email}`)
      
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      console.log(`[stripe-webhook] ❌ Subscription cancelled — sub: ${subscription.id}`)
      
      break
    }

    default:
      console.log(`[stripe-webhook] Event ignoré: ${type}`)
  }

  return { received: true }
})
