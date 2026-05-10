/**
 *
 * POST /api/events/{slug}/register
 * Public registration (anonymous) to an event. V1 = free only,
 * no auth, no email confirmation (just DB record).
 *
 * Body : { email, name, phone?, attendeesCount?, note?, consentParticipantsList? }
 */

import { randomBytes } from 'node:crypto'
import { useClientDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const cfg = useRuntimeConfig(event)
  const clientId = String((cfg as any).clientId || '')
  const slug = String(getRouterParam(event, 'slug') || '').trim()
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })

  const body = await readBody<{
    email?: string; name?: string; phone?: string;
    attendeesCount?: number; note?: string;
    consentParticipantsList?: boolean
  }>(event)

  const email = String(body?.email || '').trim().toLowerCase()
  const name = String(body?.name || '').trim()
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email invalide' })
  }
  if (!name || name.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Nom requis' })
  }
  const attendeesCount = Math.max(1, Math.min(10, Number(body?.attendeesCount) || 1))
  const phone = body?.phone ? String(body.phone).slice(0, 32) : null
  const note = body?.note ? String(body.note).slice(0, 1000) : null
  const consent = body?.consentParticipantsList ? 1 : 0

  // Charge l'event
  const events = await db.query<any>(
    `SELECT id_event, registration_open, registration_deadline, max_participants, status
       FROM cs_event
      WHERE client_id = ? AND slug = ?
      LIMIT 1`,
    [clientId, slug],
  )
  const ev = events[0]
  if (!ev) throw createError({ statusCode: 404, statusMessage: 'Event introuvable' })
  if (ev.status !== 'published') throw createError({ statusCode: 409, statusMessage: 'Event non disponible' })
  if (Number(ev.registration_open) !== 1) throw createError({ statusCode: 409, statusMessage: 'Inscriptions fermées' })
  if (ev.registration_deadline && new Date(ev.registration_deadline) < new Date()) {
    throw createError({ statusCode: 409, statusMessage: 'Deadline d\'inscription dépassée' })
  }

  // Limite de places
  if (ev.max_participants) {
    const counts = await db.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM cs_event_registration
        WHERE id_event = ? AND status = 'confirmed'`,
      [ev.id_event],
    )
    const total = Number(counts[0]?.total || 0)
    if (total + attendeesCount > Number(ev.max_participants)) {
      throw createError({ statusCode: 409, statusMessage: 'Plus de places disponibles' })
    }
  }

  // Détecte doublon (email + event)
  const dup = await db.query<any>(
    `SELECT id_registration, status FROM cs_event_registration
      WHERE id_event = ? AND email = ? LIMIT 1`,
    [ev.id_event, email],
  )
  if (dup[0]) {
    if (dup[0].status === 'confirmed') {
      return { ok: true, alreadyRegistered: true, idRegistration: Number(dup[0].id_registration) }
    }
    // pending/cancelled → réactiver
    await db.run(
      `UPDATE cs_event_registration
          SET status = 'confirmed', name = ?, phone = ?, attendees_count = ?, note = ?,
              consent_participants_list = ?, date_upd = now()
        WHERE id_registration = ?`,
      [name, phone, attendeesCount, note, consent, dup[0].id_registration],
    )
    return { ok: true, reactivated: true, idRegistration: Number(dup[0].id_registration) }
  }

  // Nouvelle inscription
  const token = randomBytes(24).toString('hex')
  const ip = String(getHeader(event, 'x-forwarded-for') || '').split(',')[0].trim() || null
  const ua = String(getHeader(event, 'user-agent') || '').slice(0, 512) || null

  const result = await db.query<{ id_registration: number }>(
    `INSERT INTO cs_event_registration
       (id_event, email, name, phone, attendees_count, note, status, token,
        consent_participants_list, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)
     RETURNING id_registration`,
    [ev.id_event, email, name, phone, attendeesCount, note, token, consent, ip, ua],
  )

  return {
    ok: true,
    idRegistration: Number(result[0]?.id_registration || 0),
    cancelToken: token,  // l'inscrit peut revenir avec ce token pour annuler
  }
})
