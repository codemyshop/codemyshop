

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
