

import {
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const pageMetaVaisseau = vaisseauMereAcSchema.table(
  'cs_page_meta',
  {
    idPageMeta: serial('id_page_meta').primaryKey(),
    route: varchar('route', { length: 200 }).notNull(),
    layout: varchar('layout', { length: 16 })
      .$type<'prose' | 'grid' | 'component' | 'hero-only'>()
      .notNull()
      .default('prose'),
    heroEyebrow: varchar('hero_eyebrow', { length: 100 }),
    heroTitle: varchar('hero_title', { length: 300 }),
    heroSubtitle: text('hero_subtitle'),
    heroIcon: varchar('hero_icon', { length: 500 }),
    heroStats: text('hero_stats'),
    ctaPrimaryLabel: varchar('cta_primary_label', { length: 100 }),
    ctaPrimaryLink: varchar('cta_primary_link', { length: 200 }),
    ctaSecondaryLabel: varchar('cta_secondary_label', { length: 100 }),
    ctaSecondaryLink: varchar('cta_secondary_link', { length: 200 }),
    contentSource: varchar('content_source', { length: 200 }),
    cssAccent: varchar('css_accent', { length: 50 }).default('primary'),
    title: varchar('title', { length: 128 }),
    description: varchar('description', { length: 255 }),
    keywords: varchar('keywords', { length: 255 }),
    ogTitle: varchar('og_title', { length: 128 }),
    ogDescription: varchar('og_description', { length: 255 }),
    ogImage: varchar('og_image', { length: 500 }),
    ogType: varchar('og_type', { length: 50 }).default('website'),
    jsonldType: varchar('jsonld_type', { length: 50 }).default('WebPage'),
    jsonldExtra: text('jsonld_extra'),
    active: integer('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    uRoute: uniqueIndex('idx_page_meta_route').on(t.route),
  }),
)
