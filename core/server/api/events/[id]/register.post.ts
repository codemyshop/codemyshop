/**
 *
 * POST /api/events/:id/register
 * Registers a visitor to a published event — direct Drizzle DB access.
 * Email stub: console.log + extensible to Resend/SMTP.
 */
import { readBody, getRouterParam, createError } from 'h3'
import {
  createRegistration,
  getEventById,
  incrementEventCount,
  isAlreadyRegistered,
} from '~/server/utils/events'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'id') ?? ''
  const body    = await readBody<{ name: string; email: string; phone?: string }>(event)

  if (!body.name || !body.email) {
    throw createError({ statusCode: 400, message: 'name et email sont requis' })
  }

  const ev = await getEventById(eventId)
  if (!ev) throw createError({ statusCode: 404, message: 'Événement introuvable' })
  if (ev.status !== 'published') {
    throw createError({ statusCode: 403, message: "Cet événement n'accepte pas d'inscriptions" })
  }
  if (ev.capacity > 0 && ev.registrations >= ev.capacity) {
    throw createError({ statusCode: 409, message: 'Capacité maximale atteinte' })
  }

  if (await isAlreadyRegistered(eventId, body.email)) {
    throw createError({ statusCode: 409, message: 'Vous êtes déjà inscrit à cet événement' })
  }

  const registration = await createRegistration({
    eventId,
    name: body.name,
    email: body.email,
    phone: body.phone,
  })
  await incrementEventCount(eventId, 1)

  // BACKLOG #143: remplacer par appel SMTP / module newsletter AC
  console.log(
    `[EMAIL STUB] Confirmation d'inscription envoyée à ${body.email}`,
    `pour l'événement "${ev.title}" (${ev.date})`,
  )

  return { success: true, registration }
})
