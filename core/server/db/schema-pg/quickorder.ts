/**
 *
 * Drizzle PG schemas for quickorder — project #44 port-drizzle-mariadb-pg.
 *
 * 2 tables (cs_main) — listes de commande rapide B2B
 * (customer reorders their favorite products in 1 click) :
 *   - cs_quick_order_list
 *   - cs_quick_order_line
 *
 * Mapping types MariaDB -> PG :
 *   - INT AUTO_INCREMENT  -> serial
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
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const quickOrderListVaisseau = vaisseauMereAcSchema.table(
  'cs_quick_order_list',
  {
    idList: serial('id_list').primaryKey(),
    idCustomer: integer('id_customer').notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    isDefault: integer('is_default').notNull().default(0),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    kCustomer: index('id_customer').on(t.idCustomer, t.active),
    kDefault: index('default_by_customer').on(t.idCustomer, t.isDefault),
  }),
)

export const quickOrderLineVaisseau = vaisseauMereAcSchema.table(
  'cs_quick_order_line',
  {
    idLine: serial('id_line').primaryKey(),
    idList: integer('id_list').notNull(),
    idProduct: integer('id_product').notNull(),
    idProductAttribute: integer('id_product_attribute').notNull().default(0),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull().default('1'),
    position: integer('position').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    uListProduct: uniqueIndex('list_product').on(t.idList, t.idProduct, t.idProductAttribute),
    kListPosition: index('id_list_position').on(t.idList, t.position),
  }),
)

export type QuickOrderListPgRow = typeof quickOrderListVaisseau.$inferSelect
export type QuickOrderListPgInsert = typeof quickOrderListVaisseau.$inferInsert
export type QuickOrderLinePgRow = typeof quickOrderLineVaisseau.$inferSelect
export type QuickOrderLinePgInsert = typeof quickOrderLineVaisseau.$inferInsert
