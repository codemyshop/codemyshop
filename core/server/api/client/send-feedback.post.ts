/**
 *
 * POST /api/client/send-feedback
 * Satellite bridge → central hub.
 *
 * This endpoint is called by the customer feedback form.
 * It forwards the request to the central hub via a secure webhook.
 *
 * SECURITY.md R1: the webhook secret is in .env, never exposed to the frontend.
 */

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    clientId:     string
    clientName:   string
    feedbackType: string
    message:      string
    priority:     string
  }>(event)

  // R4 : validation
  if (!(body.message ?? '').trim()) {
    throw createError({ statusCode: 400, message: 'Message requis' })
  }

  const motherUrl = process.env.MOTHER_HUB_URL ?? ''
  const secret    = process.env.WEBHOOK_SECRET ?? ''

  // ── Mode local : pas de Hub distant configuré → sauvegarder localement ──
  if (!motherUrl) {
    // Fallback : sauvegarder dans le backlog local (mode standalone)
    const { randomUUID } = await import('node:crypto')
    const item: FeedbackItem = {
      id:          randomUUID(),
      clientId:    (body.clientId ?? '').trim().slice(0, 50),
      clientName:  (body.clientName ?? '').trim().slice(0, 100),
      type:        (body.feedbackType as any) ?? 'feature',
      description: body.message.trim().slice(0, 2000),
      priority:    (body.priority as any) ?? 'medium',
      status:      'pending',
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    }
    const all = await readFeedbacks()
    all.unshift(item)
    await writeFeedbacks(all)

    return { ok: true, mode: 'local', feedbackId: item.id }
  }

  // ── Mode satellite : forward vers le Vaisseau Mère ──────────────────────
  try {
    const res = await $fetch<{ ok: boolean; feedbackId?: string }>(
      `${motherUrl}/api/webhooks/incoming-feedback`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: {
          clientId:     (body.clientId ?? '').trim(),
          clientName:   (body.clientName ?? '').trim(),
          feedbackType: body.feedbackType,
          message:      body.message.trim(),
          priority:     body.priority,
          originUrl:    process.env.NUXT_PUBLIC_PS_FRONT_URL ?? '',
        },
      },
    )

    return { ok: true, mode: 'satellite', feedbackId: res.feedbackId }
  } catch (err: any) {
    console.error('[send-feedback] Erreur communication Hub central:', err?.message || err)

    // Fallback : sauvegarder localement si le Hub est injoignable
    const { randomUUID } = await import('node:crypto')
    const item: FeedbackItem = {
      id:          randomUUID(),
      clientId:    (body.clientId ?? '').trim().slice(0, 50),
      clientName:  (body.clientName ?? '').trim().slice(0, 100),
      type:        (body.feedbackType as any) ?? 'feature',
      description: body.message.trim().slice(0, 2000),
      priority:    (body.priority as any) ?? 'medium',
      status:      'pending',
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    }
    const all = await readFeedbacks()
    all.unshift(item)
    await writeFeedbacks(all)

    return { ok: true, mode: 'local-fallback', feedbackId: item.id, warning: 'Hub central injoignable — sauvegardé localement' }
  }
})
