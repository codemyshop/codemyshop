/**
 *
 * Drizzle PG schema — client config domain.
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

export const clientConfig = vaisseauMereAcSchema.table(
  'cs_client_config',
  {
    idConfig: serial('id_config').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    configJson: text('config_json').notNull(),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
