/**
 *
 * Drizzle PG schemas for ac_catchweight — task #44 port-drizzle-mariadb-pg.
 *
 * 2 tables (cs_main, AC-only) — produits au poids variable (B2B food) :
 *   - cs_product_catch_weight : config catch weight par produit
 * - cs_order_line_weight    : actual weight measured per order line
 *
 * Mapping types MariaDB -> PG :
 *   - INT AUTO_INCREMENT  -> serial
 *   - INT (PK 1:1)        -> integer().primaryKey() (cf. customer-extra pattern)
 *   - TINYINT(1)          -> integer
 *   - DECIMAL(p,s)        -> numeric(p, s)
 *   - DATETIME            -> timestamp(0) without time zone
 */

import {
  index,
  integer,
  numeric,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const productCatchWeightVaisseau = vaisseauMereAcSchema.table(
  'cs_product_catch_weight',
  {
    idProduct: integer('id_product').primaryKey(),
    isActive: integer('is_active').notNull().default(1),
    nominalWeightKg: numeric('nominal_weight_kg', { precision: 10, scale: 3 }).notNull().default('1'),
    priceUnit: varchar('price_unit', { length: 8 }).notNull().default('kg'),
    tolerancePct: numeric('tolerance_pct', { precision: 5, scale: 2 }).notNull().default('5'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)

export const orderLineWeightVaisseau = vaisseauMereAcSchema.table(
  'cs_order_line_weight',
  {
    idLineWeight: serial('id_line_weight').primaryKey(),
    idOrder: integer('id_order').notNull(),
    idOrderDetail: integer('id_order_detail').notNull(),
    idProduct: integer('id_product').notNull(),
    quantityOrdered: numeric('quantity_ordered', { precision: 12, scale: 3 }).notNull().default('0'),
    weightOrderedKg: numeric('weight_ordered_kg', { precision: 12, scale: 3 }).notNull().default('0'),
    weightShippedKg: numeric('weight_shipped_kg', { precision: 12, scale: 3 }),
    pricePerKgHt: numeric('price_per_kg_ht', { precision: 20, scale: 6 }).notNull().default('0'),
    priceOrderedHt: numeric('price_ordered_ht', { precision: 20, scale: 6 }).notNull().default('0'),
    priceFinalHt: numeric('price_final_ht', { precision: 20, scale: 6 }),
    weighedAt: timestamp('weighed_at', { mode: 'date', precision: 0 }),
    idEmployee: integer('id_employee'),
    notes: text('notes'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    uOrderDetail: uniqueIndex('order_detail').on(t.idOrderDetail),
    kOrder: index('id_order').on(t.idOrder),
    kPending: index('pending_weigh').on(t.weighedAt),
  }),
)

export type ProductCatchWeightPgRow = typeof productCatchWeightVaisseau.$inferSelect
export type ProductCatchWeightPgInsert = typeof productCatchWeightVaisseau.$inferInsert
export type OrderLineWeightPgRow = typeof orderLineWeightVaisseau.$inferSelect
export type OrderLineWeightPgInsert = typeof orderLineWeightVaisseau.$inferInsert
