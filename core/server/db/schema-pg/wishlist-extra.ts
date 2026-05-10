/**
 *
 * Drizzle PG schema — wishlist extra domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const wishlistExtra = vaisseauMereAcSchema.table(
  'cs_wishlist_extra',
  {
    idWishlist: integer('id_wishlist').notNull().primaryKey(),
    shareToken: varchar('share_token', { length: 64 }),
    metaJson: text('meta_json'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)
