

import {
  integer, numeric, primaryKey, serial, smallint, text, timestamp, varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const cmsExtra = vaisseauMereAcSchema.table(
  'cs_cms_extra',
  {
    idAcCmsExtra: serial('id_ac_cms_extra').primaryKey(),
    idCms: integer('id_cms').notNull(),
    pageType: varchar('page_type', { length: 30 }),
    targetAvatarIds: varchar('target_avatar_ids', { length: 255 }),
    editorialBrief: text('editorial_brief'),
    authorEmployeeId: integer('author_employee_id'),
    layout: varchar('layout', { length: 50 }),
    image: varchar('image', { length: 255 }),
    socialCoverUrl: varchar('social_cover_url', { length: 255 }),
    datePublished: timestamp('date_published', { mode: 'date', precision: 0 }),
    dateUpdated: timestamp('date_updated', { mode: 'date', precision: 0 }),
    displaySharedLinks: smallint('display_shared_links'),
    displayAuthorInfo: smallint('display_author_info'),
    idsProductAssociation: varchar('ids_product_association', { length: 255 }),
    idsCmsAssociation: varchar('ids_cms_association', { length: 255 }),
    generateCover: smallint('generate_cover').notNull().default(0),
    isPostedOnFb: smallint('is_posted_on_fb').notNull().default(0),
    isPostedOnGmb: smallint('is_posted_on_gmb').notNull().default(0),
    audioEnabled: smallint('audio_enabled').notNull().default(0),
    audioUrl: varchar('audio_url', { length: 255 }),
    audioText: text('audio_text'),
    audioScore: numeric('audio_score', { precision: 3, scale: 1 }),
    audioGeneratedAt: timestamp('audio_generated_at', { mode: 'date', precision: 0 }),
    reelScript: text('reel_script'),
    reelEnabled: smallint('reel_enabled').notNull().default(0),
  },
)

export const cmsExtraLang = vaisseauMereAcSchema.table(
  'cs_cms_extra_lang',
  {
    idAcCmsExtra: integer('id_ac_cms_extra').notNull(),
    idLang: integer('id_lang').notNull(),
    summary: text('summary'),
    shortDescription: text('short_description'),
    imageAlt: varchar('image_alt', { length: 255 }),
    imageTitle: varchar('image_title', { length: 255 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idAcCmsExtra, t.idLang] }),
  }),
)
