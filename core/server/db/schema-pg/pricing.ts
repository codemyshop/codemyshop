/**
 *
 * Drizzle PG schemas for pricing — task #44 port-drizzle-mariadb-pg.
 *
 * 4 tables (cs_main) — pricing B2B :
 *   - cs_price_group           : groupes B2B
 * - cs_customer_price_group  : customer ↔ group associations (with validity)
 *   - cs_price_tier            : paliers (price tiers) par produit/groupe
 *   - cs_price_contract        : contrats individuels client/produit
 *
 * Mapping types MariaDB -> PG :
 *   - INT AUTO_INCREMENT  -> serial
 *   - TINYINT(1)          -> integer
 *   - DECIMAL(p,s)        -> numeric(p, s)
 *   - DATE                -> date (mode 'string')
 *   - DATETIME            -> timestamp(0) without time zone
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

export const priceGroupVaisseau = vaisseauMereAcSchema.table(
  'cs_price_group',
  {
    idGroup: serial('id_group').primaryKey(),
    name: varchar('name', { length: 64 }).notNull(),
    priority: integer('priority').notNull().default(0),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    uName: uniqueIndex('name_unique').on(t.name),
  }),
)

export const customerPriceGroupVaisseau = vaisseauMereAcSchema.table(
  'cs_customer_price_group',
  {
    idLink: serial('id_link').primaryKey(),
    idCustomer: integer('id_customer').notNull(),
    idGroup: integer('id_group').notNull(),
    validFrom: date('valid_from', { mode: 'string' }),
    validTo: date('valid_to', { mode: 'string' }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    uCustomerGroup: uniqueIndex('customer_group').on(t.idCustomer, t.idGroup),
    kGroup: index('id_group').on(t.idGroup),
  }),
)

export const priceTierVaisseau = vaisseauMereAcSchema.table(
  'cs_price_tier',
  {
    idTier: serial('id_tier').primaryKey(),
    idGroup: integer('id_group').notNull(),
    idProduct: integer('id_product').notNull(),
    idProductAttribute: integer('id_product_attribute').notNull().default(0),
    minQuantity: numeric('min_quantity', { precision: 12, scale: 3 }).notNull().default('1'),
    unitPriceHt: numeric('unit_price_ht', { precision: 20, scale: 6 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    uGroupProductQty: uniqueIndex('group_product_qty').on(
      t.idGroup,
      t.idProduct,
      t.idProductAttribute,
      t.minQuantity,
    ),
    kResolve: index('resolve_lookup').on(t.idProduct, t.idGroup, t.active, t.minQuantity),
  }),
)

export const priceContractVaisseau = vaisseauMereAcSchema.table(
  'cs_price_contract',
  {
    idContract: serial('id_contract').primaryKey(),
    idCustomer: integer('id_customer').notNull(),
    idProduct: integer('id_product').notNull(),
    unitPriceHt: numeric('unit_price_ht', { precision: 20, scale: 6 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    validFrom: date('valid_from', { mode: 'string' }),
    validTo: date('valid_to', { mode: 'string' }),
    notes: text('notes'),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    kResolve: index('resolve_lookup').on(t.idCustomer, t.idProduct, t.active),
  }),
)

export type PriceGroupPgRow = typeof priceGroupVaisseau.$inferSelect
export type PriceGroupPgInsert = typeof priceGroupVaisseau.$inferInsert
export type CustomerPriceGroupPgRow = typeof customerPriceGroupVaisseau.$inferSelect
export type CustomerPriceGroupPgInsert = typeof customerPriceGroupVaisseau.$inferInsert
export type PriceTierPgRow = typeof priceTierVaisseau.$inferSelect
export type PriceTierPgInsert = typeof priceTierVaisseau.$inferInsert
export type PriceContractPgRow = typeof priceContractVaisseau.$inferSelect
export type PriceContractPgInsert = typeof priceContractVaisseau.$inferInsert
