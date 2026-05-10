/**
 *
 * Events facade — events + registrations. Sources of truth:
 * `cs_main.cs_events`, `cs_main.cs_event_registrations`,
 * owned by ac_events. Runtime PostgreSQL only (project #38 phase E.3).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

function mapEventRow(r: any): EventItem {
  return {
    id: Number(r.id_event ?? r.idEvent),
    title: r.title,
    description: r.description,
    dateStart: r.date_start ?? r.dateStart,
    dateEnd: r.date_end ?? r.dateEnd,
    type: (r.type) as EventType,
    capacity: Number(r.capacity),
    registrationsCount: Number(r.registrations_count ?? r.registrationsCount),
    status: r.status as EventStatus,
    location: r.location,
    meetingUrl: r.meeting_url ?? r.meetingUrl,
    coverImage: r.cover_image ?? r.coverImage,
  }
}

export type EventType = 'physique' | 'online'
export type EventStatus = 'draft' | 'published' | 'cancelled'

export interface EventItem {
  id: number
  title: string
  description: string | null
  dateStart: Date
  dateEnd: Date | null
  type: EventType
  capacity: number
  registrationsCount: number
  status: EventStatus
  location: string | null
  meetingUrl: string | null
  coverImage: string | null
}

interface EventsContext { event?: any; clientId?: string }

export async function listPublishedEvents(_ctx: EventsContext = {}): Promise<EventItem[]> {
  const rows = await usePocPg().execute<any>(sql`
    SELECT * FROM cs_main.cs_events
     WHERE status = 'published'
     ORDER BY date_start ASC
  `)
  return (rows as any[]).map(mapEventRow)
}

export async function getEventById(idEvent: number, _ctx: EventsContext = {}): Promise<EventItem | null> {
  const rows = await usePocPg().execute<any>(sql`
    SELECT * FROM cs_main.cs_events WHERE id_event = ${idEvent} LIMIT 1
  `)
  return (rows as any[])[0] ? mapEventRow((rows as any[])[0]) : null
}

/**
 * Registers a visitor to an event. Throw if the email is already registered
 * (UNIQUE id_event+email). Atomically increments registrations_count.
 */
export async function registerForEvent(
  idEvent: number,
  name: string,
  email: string,
  phone: string | null,
  _ctx: EventsContext = {},
): Promise<{ idRegistration: number }> {
  const pg = usePocPg()
  const inserted = await pg.execute<{ id_registration: number }>(sql`
    INSERT INTO cs_main.cs_event_registrations
      (id_event, name, email, phone, date_add)
    VALUES (${idEvent}, ${name}, ${email}, ${phone}, NOW())
    RETURNING id_registration
  `)
  await pg.execute(sql`
    UPDATE cs_main.cs_events
       SET registrations_count = registrations_count + 1, date_upd = NOW()
     WHERE id_event = ${idEvent}
  `)
  return { idRegistration: Number((inserted as any[])[0]?.id_registration ?? 0) }
}

export async function listRegistrationsForEvent(
  idEvent: number,
  _ctx: EventsContext = {},
): Promise<Array<{ id: number; name: string; email: string; phone: string | null; dateAdd: Date }>> {
  const rows = await usePocPg().execute<any>(sql`
    SELECT id_registration, name, email, phone, date_add
      FROM cs_main.cs_event_registrations
     WHERE id_event = ${idEvent}
     ORDER BY date_add ASC
  `)
  return (rows as any[]).map((r) => ({
    id: Number(r.id_registration),
    name: r.name,
    email: r.email,
    phone: r.phone,
    dateAdd: r.date_add,
  }))
}
