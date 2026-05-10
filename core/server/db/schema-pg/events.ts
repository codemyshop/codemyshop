/**
 *
 * Drizzle PG schema — events domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer,
  serial,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const eventRegistrations = vaisseauMereAcSchema.table(
  'cs_event_registrations',
  {
    idRegistration: serial('id_registration').primaryKey(),
    idEvent: integer('id_event').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
  },
)

export const events = vaisseauMereAcSchema.table(
  'cs_events',
  {
    idEvent: serial('id_event').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    dateStart: timestamp('date_start', { mode: 'date', precision: 0 }).notNull(),
    dateEnd: timestamp('date_end', { mode: 'date', precision: 0 }),
    type: varchar('type', { length: 8 }).notNull().default('online'),
    capacity: integer('capacity').notNull().default(0),
    registrationsCount: integer('registrations_count').notNull().default(0),
    status: varchar('status', { length: 9 }).notNull().default('draft'),
    location: varchar('location', { length: 512 }),
    meetingUrl: varchar('meeting_url', { length: 512 }),
    coverImage: varchar('cover_image', { length: 512 }),
    clientId: varchar('client_id', { length: 64 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)
