/**
 *
 * Drizzle PG schema — marketplace domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  serial,
  smallint,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const marketplaceTenant = vaisseauMereAcSchema.table(
  'cs_marketplace_tenant',
  {
    idTenantFeature: serial('id_tenant_feature').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    featureId: varchar('feature_id', { length: 64 }).notNull(),
    active: smallint('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
