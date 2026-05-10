/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Helpers events — Drizzle DB direct (cs_events + cs_event_registrations).
 * Doctrine « Zero PrestaShop webservice » 2026-04-22, single-tenant.
 *
 * Targets PostgreSQL `cs_main` (effort #44 MariaDB removal).
 *
 * ID convention: id_event / id_registration are INT auto_increment;
 * exposed as `string` on TS side via `String(...)` (compat with legacy caller
 * that did `===` comparisons on UUIDs).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import type { EventRecord, EventRegistration, EventStatus, EventType } from '~/types/event'

function asArray<T = any>(result: any): T[] {
  return (result as T[]) ?? []
}
function firstOf<T = any>(result: any): T | null {
  return asArray<T>(result)[0] ?? null
}

function toIsoOrEmpty(v: any): string {
  if (!v) return ''
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

function mapEvent(r: any): EventRecord {
  return {
    id:            String(r.id_event),
    title:         String(r.title || ''),
    description:   String(r.description || ''),
    date:          toIsoOrEmpty(r.date_start),
    endDate:       r.date_end ? toIsoOrEmpty(r.date_end) : undefined,
    type:          (r.type as EventType) || 'online',
    capacity:      Number(r.capacity || 0),
    registrations: Number(r.registrations_count || 0),
    status:        (r.status as EventStatus) || 'draft',
    location:      r.location ? String(r.location) : undefined,
    meetingUrl:    r.meeting_url ? String(r.meeting_url) : undefined,
    coverImage:    r.cover_image ? String(r.cover_image) : undefined,
    clientId:      r.client_id ? String(r.client_id) : undefined,
    createdAt:     toIsoOrEmpty(r.date_add),
  }
}

function mapRegistration(r: any): EventRegistration {
  return {
    id:        String(r.id_registration),
    eventId:   String(r.id_event),
    name:      String(r.name || ''),
    email:     String(r.email || ''),
    phone:     r.phone ? String(r.phone) : undefined,
    createdAt: toIsoOrEmpty(r.date_add),
  }
}

/** Liste tous les events (legacy : caller filtre côté JS). */
export async function readEvents(): Promise<EventRecord[]> {
  try {
    const result = asArray<any>(await usePocPg().execute(sql`
      SELECT * FROM cs_main.cs_events ORDER BY date_start ASC
    `))
    return result.map(mapEvent)
  } catch {
    return []
  }
}

/** Retrieves an event by id (string or number). */
export async function getEventById(id: string | number): Promise<EventRecord | null> {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return null
  const row = await usePocPg().execute(sql`
    SELECT * FROM cs_main.cs_events WHERE id_event = ${n} LIMIT 1
  `).then(firstOf<any>)
  return row ? mapEvent(row) : null
}

/** Creates an event. Returns the complete record with generated id. */
export async function createEvent(input: Partial<EventRecord>): Promise<EventRecord> {
  const ins: any = await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_events
        (title, description, date_start, date_end, type, capacity,
         registrations_count, status, location, meeting_url, cover_image,
         client_id, date_add, date_upd)
     VALUES (
       ${String(input.title || '').trim()},
       ${String(input.description || '').trim()},
       ${input.date || null},
       ${input.endDate || null},
       ${(input.type as string) || 'online'},
       ${Number(input.capacity || 0)},
       0,
       ${(input.status as string) || 'draft'},
       ${input.location || null},
       ${input.meetingUrl || null},
       ${input.coverImage || null},
       ${input.clientId || null},
       NOW(), NOW()
     )
     RETURNING id_event
  `)
  const newId = Number((ins as any[])?.[0]?.id_event ?? 0)
  if (!newId) throw new Error('INSERT cs_events KO')
  const row = await getEventById(newId)
  if (!row) throw new Error('Event créé mais introuvable')
  return row
}

/** Partial update of an event (immutable fields id/registrations_count are ignored). */
export async function updateEvent(id: string | number, patch: Partial<EventRecord>): Promise<EventRecord | null> {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return null
  const sets: any[] = []
  if (patch.title !== undefined)       sets.push(sql`title = ${String(patch.title)}`)
  if (patch.description !== undefined) sets.push(sql`description = ${String(patch.description)}`)
  if (patch.date !== undefined)        sets.push(sql`date_start = ${patch.date}`)
  if (patch.endDate !== undefined)     sets.push(sql`date_end = ${patch.endDate || null}`)
  if (patch.type !== undefined)        sets.push(sql`type = ${patch.type}`)
  if (patch.capacity !== undefined)    sets.push(sql`capacity = ${Number(patch.capacity)}`)
  if (patch.status !== undefined)      sets.push(sql`status = ${patch.status}`)
  if (patch.location !== undefined)    sets.push(sql`location = ${patch.location || null}`)
  if (patch.meetingUrl !== undefined)  sets.push(sql`meeting_url = ${patch.meetingUrl || null}`)
  if (patch.coverImage !== undefined)  sets.push(sql`cover_image = ${patch.coverImage || null}`)
  if (patch.clientId !== undefined)    sets.push(sql`client_id = ${patch.clientId || null}`)
  if (!sets.length) return getEventById(n)
  sets.push(sql`date_upd = NOW()`)
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_events SET ${sql.join(sets, sql`, `)} WHERE id_event = ${n}
  `)
  return getEventById(n)
}

/** Deletes an event + all its registrations. */
export async function deleteEvent(id: string | number): Promise<boolean> {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return false
  const d = usePocPg()
  await d.execute(sql`DELETE FROM cs_main.cs_event_registrations WHERE id_event = ${n}`)
  await d.execute(sql`DELETE FROM cs_main.cs_events              WHERE id_event = ${n}`)
  return true
}

/** Increments registrations_count of an event. */
export async function incrementEventCount(id: string | number, delta = 1): Promise<void> {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_events SET registrations_count = registrations_count + ${delta}, date_upd = NOW()
     WHERE id_event = ${n}
  `)
}

/** Lists all registrations (legacy: caller filters by eventId). */
export async function readRegistrations(): Promise<EventRegistration[]> {
  try {
    const result = asArray<any>(await usePocPg().execute(sql`
      SELECT * FROM cs_main.cs_event_registrations ORDER BY date_add DESC
    `))
    return result.map(mapRegistration)
  } catch {
    return []
  }
}

/** Lists registrations for a given event. */
export async function listRegistrationsForEvent(eventId: string | number): Promise<EventRegistration[]> {
  const n = Number(eventId)
  if (!Number.isFinite(n) || n <= 0) return []
  const result = asArray<any>(await usePocPg().execute(sql`
    SELECT * FROM cs_main.cs_event_registrations WHERE id_event = ${n} ORDER BY date_add DESC
  `))
  return result.map(mapRegistration)
}

/** Checks if an email is already registered for an event. */
export async function isAlreadyRegistered(eventId: string | number, email: string): Promise<boolean> {
  const n = Number(eventId)
  if (!Number.isFinite(n) || n <= 0) return false
  const row = await usePocPg().execute(sql`
    SELECT id_registration FROM cs_main.cs_event_registrations
     WHERE id_event = ${n} AND email = ${email.toLowerCase()}
     LIMIT 1
  `).then(firstOf<{ id_registration: number }>)
  return !!row
}

export interface CreateRegistrationInput {
  eventId: string | number
  name: string
  email: string
  phone?: string
}

/** Creates a registration. Returns the complete record. */
export async function createRegistration(input: CreateRegistrationInput): Promise<EventRegistration> {
  const n = Number(input.eventId)
  if (!Number.isFinite(n) || n <= 0) throw new Error('eventId invalide')
  const ins: any = await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_event_registrations (id_event, name, email, phone, date_add)
     VALUES (${n}, ${input.name.trim()}, ${input.email.trim().toLowerCase()},
             ${input.phone?.trim() || null}, NOW())
     RETURNING id_registration
  `)
  const newId = Number((ins as any[])?.[0]?.id_registration ?? 0)
  if (!newId) throw new Error('INSERT cs_event_registrations KO')
  const row = await usePocPg().execute(sql`
    SELECT * FROM cs_main.cs_event_registrations WHERE id_registration = ${newId} LIMIT 1
  `).then(firstOf<any>)
  return mapRegistration(row)
}
