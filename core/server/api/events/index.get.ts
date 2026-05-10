/**
 *
 * GET /api/events?lang=fr&upcoming=1
 * Lists published events for the current tenant + i18n.
 * upcoming=1 (default) : start_at >= now()
 * upcoming=0 : all published events (incl. past/finished)
 */

import { useClientDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const cfg = useRuntimeConfig(event)
  const clientId = String((cfg as any).clientId || '')
  const q = getQuery(event)
  const lang = String(q.lang || 'fr')
  const idLang = lang === 'en' ? 2 : 1
  const upcomingOnly = q.upcoming !== '0'

  const rows = await db.query<any>(
    `SELECT e.id_event, e.slug, e.type, e.start_at, e.end_at, e.timezone,
            e.venue_name, e.venue_address, e.postcode, e.city, e.country,
            e.lat::float AS lat, e.lng::float AS lng,
            e.meeting_url, e.max_participants, e.price_cents,
            e.registration_open, e.registration_deadline,
            e.cover_image_url, e.status, e.show_participants,
            COALESCE(el.title, elf.title)                       AS title,
            COALESCE(el.subtitle, elf.subtitle)                 AS subtitle,
            COALESCE(el.description_html, elf.description_html) AS description_html,
            (SELECT COUNT(*) FROM cs_event_registration r
              WHERE r.id_event = e.id_event AND r.status = 'confirmed') AS registered_count
       FROM cs_event e
  LEFT JOIN cs_event_lang el  ON el.id_event  = e.id_event AND el.id_lang  = ?
  LEFT JOIN cs_event_lang elf ON elf.id_event = e.id_event AND elf.id_lang = 1
      WHERE e.client_id = ?
        AND e.status = 'published'
        ${upcomingOnly ? "AND e.start_at >= now() - interval '2 hours'" : ''}
      ORDER BY e.start_at ASC, e.position ASC`,
    [idLang, clientId],
  )

  return {
    events: rows.map((r) => ({
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
      lat: r.lat,
      lng: r.lng,
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
      registeredCount: Number(r.registered_count || 0),
    })),
  }
})
