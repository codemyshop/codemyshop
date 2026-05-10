/**
 *
 * Drizzle PG schema — shelf domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const shelf = vaisseauMereAcSchema.table(
  'cs_shelf',
  {
    idShelf: serial('id_shelf').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull().default('ac-hub'),
    sectionType: varchar('section_type', { length: 64 }).notNull(),
    position: integer('position').notNull().default(0),
    title: varchar('title', { length: 512 }),
    subtitle: varchar('subtitle', { length: 512 }),
    content: text('content'),
    config: text('config'),
    active: smallint('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)
