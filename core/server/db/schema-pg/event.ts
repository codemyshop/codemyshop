

import {
  decimal,
  index,
  integer,
  pgSchema,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export type EventType = 'online' | 'irl' | 'hybrid'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled'

export const eventVaisseau = vaisseauMereAcSchema.table(
  'cs_event',
  {
    idEvent: serial('id_event').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    slug: varchar('slug', { length: 96 }).notNull(),
    type: varchar('type', { length: 8 }).$type<EventType>().notNull().default('irl'),
    startAt: timestamp('start_at', { mode: 'date' }).notNull(),
    endAt: timestamp('end_at', { mode: 'date' }),
    timezone: varchar('timezone', { length: 64 }).notNull().default('Europe/Paris'),
    venueName: varchar('venue_name', { length: 128 }),
    venueAddress: varchar('venue_address', { length: 255 }),
    postcode: varchar('postcode', { length: 16 }),
    city: varchar('city', { length: 96 }),
    country: varchar('country', { length: 2 }).default('FR'),
    lat: decimal('lat', { precision: 9, scale: 6 }),
    lng: decimal('lng', { precision: 9, scale: 6 }),
    meetingUrl: varchar('meeting_url', { length: 512 }),
    maxParticipants: integer('max_participants'),
    priceCents: integer('price_cents').notNull().default(0),
    registrationOpen: smallint('registration_open').notNull().default(1),
    registrationDeadline: timestamp('registration_deadline', { mode: 'date' }),
    coverImageUrl: varchar('cover_image_url', { length: 512 }),
    status: varchar('status', { length: 12 }).$type<EventStatus>().notNull().default('draft'),
    showParticipants: smallint('show_participants').notNull().default(1),
    position: integer('position').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    uClientSlug: uniqueIndex('uk_event_client_slug').on(t.clientId, t.slug),
    idxStatusStart: index('idx_event_status_start').on(t.clientId, t.status, t.startAt),
  }),
)

export const eventLangVaisseau = vaisseauMereAcSchema.table(
  'cs_event_lang',
  {
    idEvent: integer('id_event').notNull(),
    idLang: integer('id_lang').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    subtitle: varchar('subtitle', { length: 255 }),
    descriptionHtml: text('description_html'),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idEvent, t.idLang] }),
  }),
)

export const eventRegistrationVaisseau = vaisseauMereAcSchema.table(
  'cs_event_registration',
  {
    idRegistration: serial('id_registration').primaryKey(),
    idEvent: integer('id_event').notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    attendeesCount: integer('attendees_count').notNull().default(1),
    note: text('note'),
    status: varchar('status', { length: 12 }).$type<RegistrationStatus>().notNull().default('confirmed'),
    token: varchar('token', { length: 64 }).notNull(),
    consentParticipantsList: smallint('consent_participants_list').notNull().default(0),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 512 }),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    uEventEmail: uniqueIndex('uk_event_registration_event_email').on(t.idEvent, t.email),
    idxToken: index('idx_event_registration_token').on(t.token),
  }),
)

export type EventPgRow = typeof eventVaisseau.$inferSelect
export type EventPgInsert = typeof eventVaisseau.$inferInsert
export type EventLangPgRow = typeof eventLangVaisseau.$inferSelect
export type EventRegistrationPgRow = typeof eventRegistrationVaisseau.$inferSelect
export type EventRegistrationPgInsert = typeof eventRegistrationVaisseau.$inferInsert
