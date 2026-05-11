

import {
  integer, primaryKey, varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const profileSection = vaisseauMereAcSchema.table(
  'cs_profile_section',
  {
    idProfile: integer('id_profile').notNull(),
    section: varchar('section', { length: 64 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idProfile, t.section] }),
  }),
)
