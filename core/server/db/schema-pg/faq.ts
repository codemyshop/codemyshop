/**
 *
 * Drizzle PG schemas for ac_faq — task #38 Phase 1 step 6.
 *
 * 2 tables (cs_main, internal-only for this step; tenant cohabitation
 * via dedicated schemas possible later when the database migrates):
 * - cs_faq      : polymorphic entity (parent_type / parent_id)
 *   - cs_faq_lang : i18n (question + answer)
 *
 * Polymorphic pattern preserved as-is. Composite PK (id_faq, id_lang)
 * on _lang, index (parent_type, parent_id, position) on parent.
 */

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
