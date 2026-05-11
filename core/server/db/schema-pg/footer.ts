

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

export const footerVaisseau = vaisseauMereAcSchema.table(
  'cs_footer',
  {
    idFooter: serial('id_footer').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull().default('ac-hub'),
    columnPosition: integer('column_position').notNull().default(0),
    linkHref: varchar('link_href', { length: 512 }).notNull(),
    linkExternal: integer('link_external').notNull().default(0),
    linkPosition: integer('link_position').notNull().default(0),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    kClient: index('idx_footer_client').on(t.clientId),
    kColumn: index('idx_footer_column').on(t.clientId, t.columnPosition, t.linkPosition),
  }),
)

export const footerLangVaisseau = vaisseauMereAcSchema.table(
  'cs_footer_lang',
  {
    idFooter: integer('id_footer').notNull(),
    idLang: integer('id_lang').notNull(),
    columnTitle: varchar('column_title', { length: 128 }).notNull().default(''),
    linkLabel: varchar('link_label', { length: 128 }).notNull().default(''),
    linkBadge: varchar('link_badge', { length: 64 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idFooter, t.idLang] }),
    kLang: index('idx_footer_lang_lang').on(t.idLang),
  }),
)

export const footerConfigVaisseau = vaisseauMereAcSchema.table(
  'cs_footer_config',
  {
    idFooterConfig: serial('id_footer_config').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    footerTheme: varchar('footer_theme', { length: 16 }).notNull().default('dark'),
    logoSrc: varchar('logo_src', { length: 512 }),
    logoHref: varchar('logo_href', { length: 255 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 64 }),
    contactAddress: varchar('contact_address', { length: 512 }),
    contactCtaHref: varchar('contact_cta_href', { length: 255 }),
    newsletterEnabled: integer('newsletter_enabled').notNull().default(0),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    uClient: uniqueIndex('uk_footer_config_client').on(t.clientId),
  }),
)

export const footerConfigLangVaisseau = vaisseauMereAcSchema.table(
  'cs_footer_config_lang',
  {
    idFooterConfig: integer('id_footer_config').notNull(),
    idLang: integer('id_lang').notNull(),
    description: text('description'),
    hours: text('hours'),
    logoAlt: varchar('logo_alt', { length: 255 }),
    contactCtaLabel: varchar('contact_cta_label', { length: 128 }),
    bottombarCopyright: varchar('bottombar_copyright', { length: 255 }),
    newsletterTitle: varchar('newsletter_title', { length: 255 }),
    newsletterDescription: text('newsletter_description'),
    newsletterPlaceholder: varchar('newsletter_placeholder', { length: 128 }),
    newsletterCtaLabel: varchar('newsletter_cta_label', { length: 64 }),
    newsletterConsentText: text('newsletter_consent_text'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idFooterConfig, t.idLang] }),
    kLang: index('idx_footer_config_lang_lang').on(t.idLang),
  }),
)

export const footerSocialVaisseau = vaisseauMereAcSchema.table(
  'cs_footer_social',
  {
    idSocial: serial('id_social').primaryKey(),
    idFooterConfig: integer('id_footer_config').notNull(),
    platform: varchar('platform', { length: 32 }).notNull(),
    href: varchar('href', { length: 512 }).notNull(),
    position: integer('position').notNull().default(0),
    active: integer('active').notNull().default(1),
  },
  (t) => ({
    kCfgPos: index('idx_footer_social_cfg_pos').on(t.idFooterConfig, t.position),
  }),
)

export const footerSocialLangVaisseau = vaisseauMereAcSchema.table(
  'cs_footer_social_lang',
  {
    idSocial: integer('id_social').notNull(),
    idLang: integer('id_lang').notNull(),
    label: varchar('label', { length: 128 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idSocial, t.idLang] }),
    kLang: index('idx_footer_social_lang_lang').on(t.idLang),
  }),
)

export type FooterPgRow = typeof footerVaisseau.$inferSelect
export type FooterLangPgRow = typeof footerLangVaisseau.$inferSelect
export type FooterConfigPgRow = typeof footerConfigVaisseau.$inferSelect
export type FooterConfigLangPgRow = typeof footerConfigLangVaisseau.$inferSelect
export type FooterSocialPgRow = typeof footerSocialVaisseau.$inferSelect
export type FooterSocialLangPgRow = typeof footerSocialLangVaisseau.$inferSelect
