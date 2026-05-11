

import { z } from 'zod'
import { eventBus } from '~/server/operations/bus/EventBus'
import { createQuoteRequestedEvent } from '~/server/operations/events/QuoteRequestedEvent'
import { rateLimit } from '~/server/utils/redis'

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
  
  
  siret: z.string()
    .min(1, 'SIRET requis')
    .transform(s => s.replace(/\s+/g, '').trim())
    .refine(s => /^\d{14}$/.test(s), 'SIRET invalide (14 chiffres attendus)'),
  activite: z.string().optional().default('').transform(s => s.trim()),
  message: z.string().optional().default('').transform(s => s.trim()),
  items: z.array(QuoteItemSchema).min(1, 'Le devis doit contenir au moins un produit'),
})

export default defineEventHandler(async (event) => {
  
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!(await rateLimit(`quote-submit:${ip}`, 5, 600))) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de demandes de devis. Réessayez dans quelques minutes.',
      data: { code: 'RATE_LIMITED' },
    })
  }

  const body = await readBody(event)

  
  const parsed = QuoteSubmitSchema.safeParse(body)

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Données invalides'
    throw createError({ statusCode: 400, message: firstError })
  }

  const data = parsed.data

  
  
  
  
  
  const domainEvent = createQuoteRequestedEvent({
    ...data,
    totalItems: data.items.reduce((s, i) => s + i.quantity, 0),
  })

  eventBus.publish(domainEvent)

  
  return { success: true, eventId: domainEvent.id }
})
