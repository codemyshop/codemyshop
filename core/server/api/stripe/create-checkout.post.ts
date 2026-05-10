/**
 *
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout session.
 * Supporte deux modes :
 *   - Starter : Setup one-time (2 500€) + abonnement 39€/mois
 * - Premium: Subscription 800€/month with 30-day trial
 *
 * Body :
 * clientName  — client name (e.g., "julie-immo")
 * email       — client email
 * priceId     — Stripe recurring price ID (MRR)
 * setupPriceId — (optional) one-time price ID (Setup)
 * plan        — 'starter' | 'custom-flywheel' (default: starter)
 * successUrl  — redirect URL after payment
 * cancelUrl   — redirect URL if cancellation
 */
export default defineEventHandler(async (event) => {
  const stripe = useStripe()

  const body = await readBody<{
    clientName: string
    email: string
    priceId: string
    setupPriceId?: string
    plan?: string
    successUrl?: string
    cancelUrl?: string
  }>(event)

  if (!body.clientName || !body.email || !body.priceId) {
    throw createError({ statusCode: 400, message: 'clientName, email et priceId requis' })
  }

  const origin = getRequestHeader(event, 'origin')
    || getRequestHeader(event, 'referer')?.replace(/\/[^/]*$/, '')
    || 'https://codemyshop.com'

  const plan = body.plan ?? 'starter'

  try {
    // Construire les line_items
    const lineItems: Array<{ price: string; quantity: number }> = []

    // Setup one-time (si fourni)
    if (body.setupPriceId) {
      lineItems.push({ price: body.setupPriceId, quantity: 1 })
    }

    // Abonnement récurrent
    lineItems.push({ price: body.priceId, quantity: 1 })

    // Déterminer le mode : si on a un setupPriceId one-time + un MRR,
    // on utilise mode 'subscription' — Stripe gère le mix automatiquement
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'sepa_debit'],
      customer_email: body.email,
      client_reference_id: body.clientName,

      line_items: lineItems,

      subscription_data: {
        metadata: {
          client_name: body.clientName,
          plan,
        },
        // Trial uniquement pour le Premium (le Starter paie immédiatement)
        ...(plan === 'custom-flywheel' ? { trial_period_days: 30 } : {}),
      },

      metadata: {
        client_name: body.clientName,
        plan,
      },

      success_url: body.successUrl ?? `${origin}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl ?? `${origin}/offre-starter`,
    })

    return {
      sessionId: session.id,
      url: session.url,
    }
  } catch (err: any) {
    console.error('[stripe] Checkout session error:', err?.message)
    throw createError({ statusCode: 500, message: `Stripe error: ${err?.message}` })
  }
})
