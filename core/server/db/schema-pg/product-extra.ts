/**
 *
 * Drizzle PG schema — product extra domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer, primaryKey, timestamp, varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const productExtra = vaisseauMereAcSchema.table(
  'cs_product_extra',
  {
    idProduct: integer('id_product').notNull().primaryKey(),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const productExtraLang = vaisseauMereAcSchema.table(
  'cs_product_extra_lang',
  {
    idProduct: integer('id_product').notNull(),
    idLang: integer('id_lang').notNull(),
    h1: varchar('h1', { length: 255 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idProduct, t.idLang] }),
  }),
)
