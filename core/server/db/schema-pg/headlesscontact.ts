/**
 *
 * Drizzle PG schema — headlesscontact domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  serial,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const headlesscontactMessage = vaisseauMereAcSchema.table(
  'cs_headlesscontact_message',
  {
    idMessage: serial('id_message').primaryKey(),
    company: varchar('company', { length: 200 }).notNull(),
    siret: varchar('siret', { length: 14 }),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    message: text('message').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    status: varchar('status', { length: 8 }).notNull().default('new'),
    emailVerifiedStatus: varchar('email_verified_status', { length: 16 }),
    emailVerifiedAt: timestamp('email_verified_at', { mode: 'date', precision: 0 }),
    linkedinUrl: varchar('linkedin_url', { length: 255 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
