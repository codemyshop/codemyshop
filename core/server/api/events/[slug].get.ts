/**
 *
 * GET /api/events/{slug}?lang=fr
 * Event details + public list of attendees who have consented.
 */

import { useClientDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const cfg = useRuntimeConfig(event)
  const clientId = String((cfg as any).clientId || '')
  const slug = String(getRouterParam(event, 'slug') || '').trim()
  const lang = String(getQuery(event).lang || 'fr')
  const idLang = lang === 'en' ? 2 : 1

  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })

  const rows = await db.query<any>(
    `SELECT e.*,
            e.lat::float  AS lat_f,
            e.lng::float  AS lng_f,
            COALESCE(el.title, elf.title)                       AS title,
            COALESCE(el.subtitle, elf.subtitle)                 AS subtitle,
            COALESCE(el.description_html, elf.description_html) AS description_html,
            COALESCE(el.meta_title, elf.meta_title)             AS meta_title,
            COALESCE(el.meta_description, elf.meta_description) AS meta_description
       FROM cs_event e
  LEFT JOIN cs_event_lang el  ON el.id_event  = e.id_event AND el.id_lang  = ?
  LEFT JOIN cs_event_lang elf ON elf.id_event = e.id_event AND elf.id_lang = 1
      WHERE e.client_id = ? AND e.slug = ? AND e.status = 'published'
      LIMIT 1`,
    [idLang, clientId, slug],
  )
  const r = rows[0]
  if (!r) throw createError({ statusCode: 404, statusMessage: 'Event not found' })

  // Compteur total + participants publics (consent_participants_list = 1)
  const counts = await db.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM cs_event_registration
      WHERE id_event = ? AND status = 'confirmed'`,
    [r.id_event],
  )
  const registeredCount = Number(counts[0]?.total || 0)

  let participants: Array<{ name: string; city?: string }> = []
  if (Number(r.show_participants) === 1) {
    const list = await db.query<{ name: string }>(
      `SELECT name FROM cs_event_registration
        WHERE id_event = ? AND status = 'confirmed' AND consent_participants_list = 1
        ORDER BY date_add ASC LIMIT 200`,
      [r.id_event],
    )
    participants = list.map((p) => ({ name: String(p.name).split(' ').slice(0, 1).concat(String(p.name).split(' ').slice(1, 2).map((s) => s ? s[0] + '.' : '')).join(' ') }))
  }

  return {
    event: {
      id: Number(r.id_event),
      slug: String(r.slug),
      type: String(r.type),
      startAt: r.start_at,
      endAt: r.end_at,
      timezone: String(r.timezone),
      venueName: r.venue_name,
      venueAddress: r.venue_address,
      postcode: r.postcode,
      city: r.city,
      country: r.country,
      lat: r.lat_f,
      lng: r.lng_f,
      meetingUrl: r.meeting_url,
      maxParticipants: r.max_participants,
      priceCents: Number(r.price_cents),
      isFree: Number(r.price_cents) === 0,
      registrationOpen: Number(r.registration_open) === 1,
      registrationDeadline: r.registration_deadline,
      coverImageUrl: r.cover_image_url,
      status: r.status,
      showParticipants: Number(r.show_participants) === 1,
      title: r.title,
      subtitle: r.subtitle,
      descriptionHtml: r.description_html,
      metaTitle: r.meta_title,
      metaDescription: r.meta_description,
      registeredCount,
      seatsLeft: r.max_participants ? Math.max(0, Number(r.max_participants) - registeredCount) : null,
    },
    participants,
  }
})
