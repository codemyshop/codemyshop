/**
 *
 * Drizzle PG schema for `cs_category_cms` — task #44 port-drizzle-mariadb-pg.
 *
 * N-N pivot product category ↔ CMS article, owned by `ac_cmscategoryextra`.
 * Pure association (no _lang field). Composite PK (id_category, id_cms).
 * Position carries the ordering in the SEO silo on the category side.
 *
 * Mapping types MariaDB -> PG :
 *   - INT NOT NULL  -> integer (PK composite)
 *   - DATETIME      -> timestamp(0) without time zone
 */

import { index, integer, pgSchema, primaryKey, timestamp } from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const categoryCmsVaisseau = vaisseauMereAcSchema.table(
  'cs_category_cms',
  {
    idCategory: integer('id_category').notNull(),
    idCms: integer('id_cms').notNull(),
    position: integer('position').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idCategory, t.idCms] }),
    kCategory: index('idx_category').on(t.idCategory, t.position),
    kCms: index('idx_cms').on(t.idCms),
  }),
)

export type CategoryCmsPgRow = typeof categoryCmsVaisseau.$inferSelect
export type CategoryCmsPgInsert = typeof categoryCmsVaisseau.$inferInsert
