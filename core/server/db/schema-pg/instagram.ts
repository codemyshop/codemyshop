

import {
  serial,
  smallint,
  integer,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const instagramPost = vaisseauMereAcSchema.table(
  'cs_instagram_post',
  {
    idPost: serial('id_post').primaryKey(),
    igId: varchar('ig_id', { length: 64 }).notNull(),
    mediaType: varchar('media_type', { length: 14 }).notNull().default('IMAGE'),
    imageUrl: varchar('image_url', { length: 2048 }),
    thumbnailUrl: varchar('thumbnail_url', { length: 2048 }),
    localPath: varchar('local_path', { length: 512 }),
    permalink: varchar('permalink', { length: 512 }).notNull(),
    postedAt: timestamp('posted_at', { mode: 'date', precision: 0 }).notNull(),
    active: smallint('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const instagramPostLang = vaisseauMereAcSchema.table(
  'cs_instagram_post_lang',
  {
    idPost: integer('id_post').notNull(),
    idLang: integer('id_lang').notNull(),
    caption: text('caption'),
  },
)
