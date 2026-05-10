/**
 *
 * Drizzle PG schema — expiry domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer,
  numeric,
  serial,
  smallint,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const expiryApplied = vaisseauMereAcSchema.table(
  'cs_expiry_applied',
  {
    idApplied: serial('id_applied').primaryKey(),
    idLot: integer('id_lot').notNull(),
    idSpecificPrice: integer('id_specific_price').notNull(),
    discountPct: numeric('discount_pct', { precision: 5, scale: 2 }).notNull(),
    appliedAt: timestamp('applied_at', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    removedAt: timestamp('removed_at', { mode: 'date', precision: 0 }),
  },
)

export const expiryRule = vaisseauMereAcSchema.table(
  'cs_expiry_rule',
  {
    idRule: serial('id_rule').primaryKey(),
    label: varchar('label', { length: 64 }).notNull(),
    minDays: integer('min_days').notNull(),
    maxDays: integer('max_days').notNull(),
    discountPct: numeric('discount_pct', { precision: 5, scale: 2 }).notNull().default('0.00'),
    active: smallint('active').notNull().default(1),
    position: integer('position').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
