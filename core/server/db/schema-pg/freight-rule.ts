/**
 *
 * Drizzle PG schema for `cs_freight_rule` — task #44 port-drizzle-mariadb-pg.
 *
 * Shipping rules (B2B), owned by `ac_freightrule`. A rule declares a
 * scope (all/carrier/zone/customer_group) + a threshold (amount_ht/weight_kg/pallets)
 * and a priority — resolution chooses the winning rule (highest
 * priority among eligible ones).
 *
 * Mapping types MariaDB -> PG :
 *   - INT AUTO_INCREMENT     -> serial
 *   - TINYINT(1)             -> integer
 *   - ENUM('all'…)           -> varchar + $type<…>
 *   - DECIMAL(p,s)           -> numeric(p, s)
 *   - DATETIME               -> timestamp(0) without time zone (defaultNow)
 */

import { index, integer, numeric, pgSchema, serial, timestamp, varchar } from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export type FreightRuleScope = 'all' | 'carrier' | 'zone' | 'customer_group'
export type FreightRuleThresholdType = 'amount_ht' | 'weight_kg' | 'pallets'

export const freightRuleVaisseau = vaisseauMereAcSchema.table(
  'cs_freight_rule',
  {
    idRule: serial('id_rule').primaryKey(),
    label: varchar('label', { length: 128 }).notNull(),
    scope: varchar('scope', { length: 14 }).$type<FreightRuleScope>().notNull().default('all'),
    scopeId: integer('scope_id').notNull().default(0),
    thresholdType: varchar('threshold_type', { length: 9 })
      .$type<FreightRuleThresholdType>()
      .notNull()
      .default('amount_ht'),
    thresholdValue: numeric('threshold_value', { precision: 12, scale: 3 }).notNull().default('0'),
    priority: integer('priority').notNull().default(0),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    kActiveScope: index('active_scope').on(t.active, t.scope, t.scopeId),
  }),
)

export type FreightRulePgRow = typeof freightRuleVaisseau.$inferSelect
export type FreightRulePgInsert = typeof freightRuleVaisseau.$inferInsert
