/**
 *
 * Drizzle PG schema — category cross-link domain.
 * Self-referential N-N association between ps_category : id_category displays
 * id_cross_category as a pseudo-subcategory at the end of native children.
 * Created 2026-05-08.
 */

import {
  integer,
  timestamp,
  primaryKey,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const categoryCross = vaisseauMereAcSchema.table(
  'cs_category_cross',
  {
    idCategory: integer('id_category').notNull(),
    idCrossCategory: integer('id_cross_category').notNull(),
    position: integer('position').notNull().default(0),
    dateAdd: timestamp('date_add', { precision: 0, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idCategory, t.idCrossCategory] }),
  }),
)
