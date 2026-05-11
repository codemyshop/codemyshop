

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

export const homepageSectionVaisseau = vaisseauMereAcSchema.table(
  'cs_homepage_section',
  {
    idSection: serial('id_section').primaryKey(),
    position: integer('position').notNull().default(0),
    type: varchar('type', { length: 40 }).notNull(),
    limitItems: integer('limit_items'),
    intervalMs: integer('interval_ms'),
    cols: integer('cols'),
    heightPx: integer('height_px'),
    ctaHref: varchar('cta_href', { length: 512 }),
    socialHandle: varchar('social_handle', { length: 128 }),
    socialUrl: varchar('social_url', { length: 512 }),
    featuredPosition: varchar('featured_position', { length: 8 }),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    kPosition: index('idx_homepage_section_position').on(t.position),
    kActive: index('idx_homepage_section_active').on(t.active),
  }),
)

export const homepageSectionLangVaisseau = vaisseauMereAcSchema.table(
  'cs_homepage_section_lang',
  {
    idSection: integer('id_section').notNull(),
    idLang: integer('id_lang').notNull(),
    title: varchar('title', { length: 255 }),
    subtitle: text('subtitle'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idSection, t.idLang] }),
    kLang: index('idx_homepage_section_lang_lang').on(t.idLang),
  }),
)

export const homepageSectionAvatarVaisseau = vaisseauMereAcSchema.table(
  'cs_homepage_section_avatar',
  {
    idSection: integer('id_section').notNull(),
    idAvatar: integer('id_avatar').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idSection, t.idAvatar] }),
  }),
)

export type HomepageSectionPgRow = typeof homepageSectionVaisseau.$inferSelect
export type HomepageSectionLangPgRow = typeof homepageSectionLangVaisseau.$inferSelect
export type HomepageSectionAvatarPgRow = typeof homepageSectionAvatarVaisseau.$inferSelect
