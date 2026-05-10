/**
 *
 * Drizzle PG schema — redirect domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer,
  serial,
  smallint,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const redirect = vaisseauMereAcSchema.table(
  'cs_redirect',
  {
    idRedirect: serial('id_redirect').primaryKey(),
    sourcePath: varchar('source_path', { length: 255 }).notNull(),
    targetPath: varchar('target_path', { length: 255 }).notNull(),
    statusCode: smallint('status_code').notNull().default(301),
    sourceKind: varchar('source_kind', { length: 8 }).notNull().default('manual'),
    sourceId: integer('source_id'),
    hits: integer('hits').notNull().default(0),
    active: smallint('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
