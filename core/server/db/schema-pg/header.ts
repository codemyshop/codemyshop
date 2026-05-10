/**
 *
 * Drizzle PG schemas for ac_header — task #38 Phase 1 step 5.
 *
 * 4 tables (cs_main, multi-tenant row-level via client_id) :
 *   - cs_header             : 1 row par tenant (client_id unique)
 *   - cs_header_lang        : i18n (logo_alt, logo_text, topbar_message)
 * - cs_header_locale      : languages of the topbar switcher
 * - cs_header_locale_lang : i18n label of the switcher
 */

import {
  index,
  integer,
  pgSchema,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const headerVaisseau = vaisseauMereAcSchema.table(
  'cs_header',
  {
    idHeader: serial('id_header').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    logoSrc: varchar('logo_src', { length: 512 }),
    logoHref: varchar('logo_href', { length: 255 }).default('/'),
    logoClass: varchar('logo_class', { length: 128 }).default('h-10 w-auto max-w-[160px] object-contain'),
    topbarShowLanguages: integer('topbar_show_languages').notNull().default(0),
    topbarAlign: varchar('topbar_align', { length: 16 }).notNull().default('left'),
    contactEmail: varchar('contact_email', { length: 255 }),
    featShowSearch: integer('feat_show_search').notNull().default(0),
    featShowWishlist: integer('feat_show_wishlist').notNull().default(0),
    featShowLogin: integer('feat_show_login').notNull().default(1),
    featShowContact: integer('feat_show_contact').notNull().default(0),
    featShowCart: integer('feat_show_cart').notNull().default(0),
    featShowBlogLink: integer('feat_show_blog_link').notNull().default(0),
    featShowContactLink: integer('feat_show_contact_link').notNull().default(0),
    featShowGiftcardLink: integer('feat_show_giftcard_link').notNull().default(0),
    featShowStoresLink: integer('feat_show_stores_link').notNull().default(0),
    featStickyHeader: integer('feat_sticky_header').notNull().default(0),
    featHeaderLayout: varchar('feat_header_layout', { length: 16 }).notNull().default('stacked'),
    navBgColor: varchar('nav_bg_color', { length: 9 }),
    navTextColor: varchar('nav_text_color', { length: 9 }),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    uClient: uniqueIndex('uk_header_client').on(t.clientId),
  }),
)

export const headerLangVaisseau = vaisseauMereAcSchema.table(
  'cs_header_lang',
  {
    idHeader: integer('id_header').notNull(),
    idLang: integer('id_lang').notNull(),
    logoAlt: varchar('logo_alt', { length: 255 }),
    logoText: varchar('logo_text', { length: 128 }),
    topbarMessage: text('topbar_message'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idHeader, t.idLang] }),
    kLang: index('idx_header_lang_lang').on(t.idLang),
  }),
)

export const headerLocaleVaisseau = vaisseauMereAcSchema.table(
  'cs_header_locale',
  {
    idHeaderLocale: serial('id_header_locale').primaryKey(),
    idHeader: integer('id_header').notNull(),
    code: varchar('code', { length: 8 }).notNull(),
    href: varchar('href', { length: 255 }).notNull().default('/'),
    position: integer('position').notNull().default(0),
    active: integer('active').notNull().default(1),
  },
  (t) => ({
    kHeaderPos: index('idx_header_locale_header_pos').on(t.idHeader, t.position),
  }),
)

export const headerLocaleLangVaisseau = vaisseauMereAcSchema.table(
  'cs_header_locale_lang',
  {
    idHeaderLocale: integer('id_header_locale').notNull(),
    idLang: integer('id_lang').notNull(),
    label: varchar('label', { length: 64 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idHeaderLocale, t.idLang] }),
    kLang: index('idx_header_locale_lang_lang').on(t.idLang),
  }),
)

export type HeaderPgRow = typeof headerVaisseau.$inferSelect
export type HeaderLangPgRow = typeof headerLangVaisseau.$inferSelect
export type HeaderLocalePgRow = typeof headerLocaleVaisseau.$inferSelect
export type HeaderLocaleLangPgRow = typeof headerLocaleLangVaisseau.$inferSelect
