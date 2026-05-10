/**
 *
 * Drizzle PG schemas for ac_homepageblock — task #38 Phase 1 step 5.
 *
 * 2 tables (cs_main, AC-only) :
 * - cs_homepage_block       : typed sub-items (slide/feature/category/banner/...)
 *   - cs_homepage_block_lang  : i18n (label, title, subtitle, description, answer_html…)
 *
 * Note: MEDIUMTEXT MariaDB → text PG (unbounded — no size distinction in PG).
 */

import {
  index,
  integer,
  pgSchema,
  primaryKey,
  serial,
  text,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const homepageBlockVaisseau = vaisseauMereAcSchema.table(
  'cs_homepage_block',
  {
    idBlock: serial('id_block').primaryKey(),
    idSection: integer('id_section').notNull(),
    parentBlockId: integer('parent_block_id'),
    blockKind: varchar('block_kind', { length: 32 }).notNull(),
    position: integer('position').notNull().default(0),
    image: varchar('image', { length: 512 }),
    icon: varchar('icon', { length: 64 }),
    href: varchar('href', { length: 512 }),
    target: varchar('target', { length: 16 }),
    slug: varchar('slug', { length: 64 }),
    extraConfigJson: text('extra_config_json'),
    active: integer('active').notNull().default(1),
  },
  (t) => ({
    kSectionPos: index('idx_homepage_block_section_pos').on(t.idSection, t.position),
    kParent: index('idx_homepage_block_parent').on(t.parentBlockId),
    kKind: index('idx_homepage_block_kind').on(t.blockKind),
  }),
)

export const homepageBlockLangVaisseau = vaisseauMereAcSchema.table(
  'cs_homepage_block_lang',
  {
    idBlock: integer('id_block').notNull(),
    idLang: integer('id_lang').notNull(),
    label: varchar('label', { length: 255 }),
    title: varchar('title', { length: 255 }),
    subtitle: varchar('subtitle', { length: 255 }),
    sticker: varchar('sticker', { length: 128 }),
    kicker: varchar('kicker', { length: 128 }),
    description: text('description'),
    text: text('text'),
    header: varchar('header', { length: 128 }),
    footer: varchar('footer', { length: 255 }),
    ctaLabel: varchar('cta_label', { length: 128 }),
    alt: varchar('alt', { length: 255 }),
    question: text('question'),
    answerHtml: text('answer_html'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idBlock, t.idLang] }),
    kLang: index('idx_homepage_block_lang_lang').on(t.idLang),
  }),
)

export type HomepageBlockPgRow = typeof homepageBlockVaisseau.$inferSelect
export type HomepageBlockLangPgRow = typeof homepageBlockLangVaisseau.$inferSelect
