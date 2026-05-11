

import {
  index,
  integer,
  pgSchema,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const faqVaisseau = vaisseauMereAcSchema.table(
  'cs_faq',
  {
    idFaq: serial('id_faq').primaryKey(),
    parentType: varchar('parent_type', { length: 32 }).notNull(),
    parentId: integer('parent_id').notNull(),
    position: integer('position').notNull().default(0),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    kParent: index('idx_faq_parent').on(t.parentType, t.parentId, t.position),
  }),
)

export const faqLangVaisseau = vaisseauMereAcSchema.table(
  'cs_faq_lang',
  {
    idFaq: integer('id_faq').notNull(),
    idLang: integer('id_lang').notNull(),
    question: varchar('question', { length: 512 }).notNull(),
    answer: text('answer').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idFaq, t.idLang] }),
    kLang: index('idx_faq_lang_lang').on(t.idLang),
  }),
)

export type FaqPgRow = typeof faqVaisseau.$inferSelect
export type FaqLangPgRow = typeof faqLangVaisseau.$inferSelect
