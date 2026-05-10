/**
 *
 * Drizzle PG schemas for lot — task #44 port-drizzle-mariadb-pg.
 *
 * 2 tables (cs_main) — supplier batch traceability (shelf life, origin,
 * calibre) + asso lot ↔ ligne de commande (consommation FIFO) :
 *   - cs_lot
 *   - cs_lot_order_detail
 *
 * Mapping types MariaDB -> PG :
 *   - INT AUTO_INCREMENT  -> serial
 *   - TINYINT(1)          -> integer
 *   - DECIMAL(p,s)        -> numeric(p, s)
 *   - DATE                -> date (mode 'string')
 *   - DATETIME            -> timestamp(0) without time zone (defaultNow)
 */

import {
  date,
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

export const lotVaisseau = vaisseauMereAcSchema.table(
  'cs_lot',
  {
    idLot: serial('id_lot').primaryKey(),
    lotNumber: varchar('lot_number', { length: 64 }).notNull(),
    idProduct: integer('id_product').notNull(),
    idProductAttribute: integer('id_product_attribute').notNull().default(0),
    idSupplier: integer('id_supplier').notNull().default(0),
    entryDate: date('entry_date', { mode: 'string' }).notNull(),
    expiryDate: date('expiry_date', { mode: 'string' }),
    quantityReceived: numeric('quantity_received', { precision: 12, scale: 3 }).notNull().default('0'),
    quantityRemaining: numeric('quantity_remaining', { precision: 12, scale: 3 }).notNull().default('0'),
    originCountry: varchar('origin_country', { length: 64 }),
    caliber: varchar('caliber', { length: 32 }),
    notes: text('notes'),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    uLotProduct: uniqueIndex('lot_product').on(t.lotNumber, t.idProduct, t.idProductAttribute),
    kProduct: index('id_product').on(t.idProduct),
    kExpiry: index('expiry_date').on(t.expiryDate),
    kSupplier: index('id_supplier').on(t.idSupplier),
  }),
)

export const lotOrderDetailVaisseau = vaisseauMereAcSchema.table(
  'cs_lot_order_detail',
  {
    idLotOrderDetail: serial('id_lot_order_detail').primaryKey(),
    idLot: integer('id_lot').notNull(),
    idOrderDetail: integer('id_order_detail').notNull(),
    idProduct: integer('id_product').notNull(),
    quantityConsumed: numeric('quantity_consumed', { precision: 12, scale: 3 }).notNull().default('0'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    kLot: index('id_lot').on(t.idLot),
    kOrderDetail: index('id_order_detail').on(t.idOrderDetail),
    kProduct: index('id_product').on(t.idProduct),
  }),
)

export type LotPgRow = typeof lotVaisseau.$inferSelect
export type LotPgInsert = typeof lotVaisseau.$inferInsert
export type LotOrderDetailPgRow = typeof lotOrderDetailVaisseau.$inferSelect
export type LotOrderDetailPgInsert = typeof lotOrderDetailVaisseau.$inferInsert
