/**
 *
 * POST /api/quote/submit
 * Entry point for B2B quote request (tenant-agnostic).
 *
 * Architecture Business OS :
 *   1. Validation stricte (Zod)
 * 2. Emission of QuoteRequestedEvent on the EventBus
 * 3. Immediate return to the client
 *
 * Handlers react in sequence (fire-and-forget on the caller side, ordered
 * on the EventBus side so that NotifyCustomer can read the ID injected by Save) :
 *   - SaveToDatabaseHandler → cs_quote_request + cs_quote_request_item (injecte _quoteRequestId)
 *   - PushToCrmHandler → CRM tenant via psProxy
 * - NotifyCustomerHandler → email receipt acknowledgment to the visitor (template DB-first quote_request)
 */

import { z } from 'zod'
import { eventBus } from '~/server/operations/bus/EventBus'
import { createQuoteRequestedEvent } from '~/server/operations/events/QuoteRequestedEvent'
import { rateLimit } from '~/server/utils/redis'

// ── Schéma Zod ─────────────────────────────────────────────────────────────

const QuoteItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  reference: z.string().optional(),
  quantity: z.number().int().min(1),
})

const QuoteSubmitSchema = z.object({
  firstname: z.string().min(1, 'Prénom requis').transform(s => s.trim()),
  lastname: z.string().min(1, 'Nom requis').transform(s => s.trim()),
  email: z.string().email('Email invalide').transform(s => s.trim().toLowerCase()),
  phone: z.string().optional().default('').transform(s => s.trim()),
  company: z.string().min(1, 'Entreprise requise').transform(s => s.trim()),
  // SIRET requis (14 chiffres, espaces tolérés). Permet la pré-qualification
  // B2B + enrichissement Sirene/Pappers côté backend.
  siret: z.string()
    .min(1, 'SIRET requis')
    .transform(s => s.replace(/\s+/g, '').trim())
    .refine(s => /^\d{14}$/.test(s), 'SIRET invalide (14 chiffres attendus)'),
  activite: z.string().optional().default('').transform(s => s.trim()),
  message: z.string().optional().default('').transform(s => s.trim()),
  items: z.array(QuoteItemSchema).min(1, 'Le devis doit contenir au moins un produit'),
})

// ── Handler ────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  // ── 0. Rate limit anti-spam (5 soumissions / 10 min par IP) ───────────
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!(await rateLimit(`quote-submit:${ip}`, 5, 600))) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de demandes de devis. Réessayez dans quelques minutes.',
      data: { code: 'RATE_LIMITED' },
    })
  }

  const body = await readBody(event)

  // ── 1. Validation Zod ──────────────────────────────────────────────────
  const parsed = QuoteSubmitSchema.safeParse(body)

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Données invalides'
    throw createError({ statusCode: 400, message: firstError })
  }

  const data = parsed.data

  // ── 2. Publish event (enrichissement INSEE déféré côté handler) ───────
  // Le verifySiret prend jusqu'à 3s (API gouv timeout). On le sort du
  // chemin HTTP : SaveToDatabaseHandler insère d'abord la row sans
  // enrichment, puis appelle verifySiret en background et fait UPDATE.
  // Le visiteur reçoit la réponse "submitted" en quelques ms.
  const domainEvent = createQuoteRequestedEvent({
    ...data,
    totalItems: data.items.reduce((s, i) => s + i.quantity, 0),
  })

  eventBus.publish(domainEvent)

  // ── 3. Retour immédiat ─────────────────────────────────────────────────
  return { success: true, eventId: domainEvent.id }
})
