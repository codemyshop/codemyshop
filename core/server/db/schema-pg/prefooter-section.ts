

import {
  index,
  integer,
  pgSchema,
  primaryKey,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const prefooterSectionVaisseau = vaisseauMereAcSchema.table(
  'cs_prefooter_section',
  {
    idSection: serial('id_section').primaryKey(),
    position: integer('position').notNull().default(0),
    type: varchar('type', { length: 64 }).notNull(),
    limitItems: integer('limit_items').notNull().default(6),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    kPositionActive: index('idx_prefooter_section_position_active').on(t.active, t.position),
    kType: index('idx_prefooter_section_type').on(t.type),
  }),
)

export const prefooterSectionLangVaisseau = vaisseauMereAcSchema.table(
  'cs_prefooter_section_lang',
  {
    idSection: integer('id_section').notNull(),
    idLang: integer('id_lang').notNull(),
    title: varchar('title', { length: 255 }),
    subtitle: varchar('subtitle', { length: 512 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idSection, t.idLang] }),
    kLang: index('idx_prefooter_section_lang_lang').on(t.idLang),
  }),
)

export type PrefooterSectionPgRow = typeof prefooterSectionVaisseau.$inferSelect
export type PrefooterSectionLangPgRow = typeof prefooterSectionLangVaisseau.$inferSelect
