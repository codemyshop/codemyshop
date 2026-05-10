/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/giftcard/order — creation of a gift card (status=pending,
 * en attente paiement).
 *
 * Body :
 *   - amount_cents       (int, 1000-50000)
 *   - delivery_mode      ('pdf' | 'email' | 'both')
 *   - purchaser_name     (string)
 *   - purchaser_email    (string)
 * - recipient_name?    (string, required if delivery_mode != 'pdf')
 * - recipient_email?   (string, required if delivery_mode != 'pdf')
 *   - personal_message?  (string, max 1000)
 *   - scheduled_send_at? (ISO date)
 *   - website (honeypot)
 *
 * Gating: feature `ac_giftcard` must be active for the tenant
 * (sinon 404 — comportement non-leaky).
 *
 * Return: { ok: true, code, pdf_url } — the code is also included to
 * allow an immediate thank you page. The pdf_url contains the
 * pdf_token (non-enumerable URL).
 */

import { resolveClientId } from '~/server/utils/db'
import { isFeatureEnabled } from '~/server/utils/feature-flags'
import { createGiftcard, type GiftcardDeliveryMode } from '~/server/utils/giftcard'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_MODES: ReadonlySet<GiftcardDeliveryMode> = new Set(['pdf', 'email', 'both'])

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)

  // Honeypot
  if (body?.website && String(body.website).trim() !== '') {
    throw createError({ statusCode: 422, statusMessage: 'Invalid request' })
  }

  const clientId = resolveClientId(event)

  // Gate marketplace — non-leaky 404
  const enabled = await isFeatureEnabled(clientId, 'ac_giftcard')
  if (!enabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const amountCents = Math.round(Number(body?.amount_cents ?? 0))
  if (!Number.isFinite(amountCents) || amountCents < 1000 || amountCents > 50000) {
    throw createError({ statusCode: 422, statusMessage: 'Montant invalide (10€ à 500€).', data: { code: 'INVALID_AMOUNT' } })
  }

  const deliveryMode = String(body?.delivery_mode ?? 'pdf') as GiftcardDeliveryMode
  if (!VALID_MODES.has(deliveryMode)) {
    throw createError({ statusCode: 422, statusMessage: 'Mode de livraison invalide.', data: { code: 'INVALID_DELIVERY' } })
  }

  const purchaserName = String(body?.purchaser_name ?? '').trim().slice(0, 128)
  const purchaserEmail = String(body?.purchaser_email ?? '').trim().slice(0, 255)
  if (!purchaserName || !EMAIL_RE.test(purchaserEmail)) {
    throw createError({ statusCode: 422, statusMessage: 'Vos coordonnées sont incomplètes.', data: { code: 'INVALID_PURCHASER' } })
  }

  let recipientName: string | null = null
  let recipientEmail: string | null = null
  if (deliveryMode !== 'pdf') {
    recipientName = String(body?.recipient_name ?? '').trim().slice(0, 128) || null
    recipientEmail = String(body?.recipient_email ?? '').trim().slice(0, 255) || null
    if (!recipientName || !recipientEmail || !EMAIL_RE.test(recipientEmail)) {
      throw createError({ statusCode: 422, statusMessage: 'Coordonnées du destinataire incomplètes.', data: { code: 'INVALID_RECIPIENT' } })
    }
  } else {
    // Mode PDF : optional recipient (cadeau imprimé pour main propre)
    recipientName = body?.recipient_name ? String(body.recipient_name).trim().slice(0, 128) : null
    recipientEmail = null
  }

  const personalMessage = body?.personal_message ? String(body.personal_message).trim().slice(0, 1000) : null

  let scheduledSendAt: Date | null = null
  if (body?.scheduled_send_at) {
    const d = new Date(String(body.scheduled_send_at))
    if (isNaN(d.getTime()) || d.getTime() < Date.now()) {
      throw createError({ statusCode: 422, statusMessage: 'Date d\'envoi invalide (doit être future).', data: { code: 'INVALID_SCHEDULE' } })
    }
    scheduledSendAt = d
  }

  try {
    const result = await createGiftcard({
      clientId,
      amountCents,
      deliveryMode,
      purchaserName,
      purchaserEmail,
      recipientName,
      recipientEmail,
      personalMessage,
      scheduledSendAt,
    })

    // Stub UX : on retourne le code à la page merci. Statut reste 'pending'
    // jusqu'à la confirmation IPN. Wire SystemPay form HMAC = backlog #285.

    return {
      ok: true,
      code: result.code,
      pdf_url: `/api/giftcard/${encodeURIComponent(result.code)}/pdf?token=${result.pdfToken}`,
      expires_at: result.expiresAt.toISOString(),
    }
  } catch (err: any) {
    console.error('[giftcard/order]', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur création carte cadeau' })
  }
})
