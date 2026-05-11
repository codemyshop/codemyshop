

import {
  integer,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const carouselQueue = vaisseauMereAcSchema.table(
  'cs_carousel_queue',
  {
    idCarousel: serial('id_carousel').primaryKey(),
    tenant: varchar('tenant', { length: 50 }).notNull().default('ac-hub'),
    idCms: integer('id_cms').notNull(),
    title: varchar('title', { length: 512 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    slidesJson: text('slides_json').notNull(),
    status: varchar('status', { length: 10 }).notNull().default('pending'),
    pdfUrl: varchar('pdf_url', { length: 512 }),
    errorMsg: varchar('error_msg', { length: 512 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const categoryCovergenQueue = vaisseauMereAcSchema.table(
  'cs_category_covergen_queue',
  {
    idCovergen: serial('id_covergen').primaryKey(),
    tenant: varchar('tenant', { length: 50 }).notNull().default('ac-hub'),
    idCategory: integer('id_category').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    keywords: varchar('keywords', { length: 255 }),
    status: varchar('status', { length: 10 }).notNull().default('pending'),
    coverUrl: varchar('cover_url', { length: 512 }),
    thumbUrl: varchar('thumb_url', { length: 512 }),
    errorMsg: varchar('error_msg', { length: 512 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const covergenQueue = vaisseauMereAcSchema.table(
  'cs_covergen_queue',
  {
    idCovergen: serial('id_covergen').primaryKey(),
    tenant: varchar('tenant', { length: 50 }).notNull().default('ac-hub'),
    idCms: integer('id_cms').notNull(),
    title: varchar('title', { length: 512 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    withAvatar: smallint('with_avatar').notNull().default(0),
    avatarId: integer('avatar_id'),
    expressionSlug: varchar('expression_slug', { length: 50 }),
    expressionImageUrl: varchar('expression_image_url', { length: 512 }),
    status: varchar('status', { length: 10 }).notNull().default('pending'),
    coverUrl: varchar('cover_url', { length: 512 }),
    thumbUrl: varchar('thumb_url', { length: 512 }),
    socialUrl: varchar('social_url', { length: 512 }),
    errorMsg: varchar('error_msg', { length: 512 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const productCovergenLog = vaisseauMereAcSchema.table(
  'cs_product_covergen_log',
  {
    idLog: serial('id_log').primaryKey(),
    idImage: integer('id_image').notNull(),
    idProduct: integer('id_product').notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    status: varchar('status', { length: 5 }).notNull().default('done'),
    filesCount: integer('files_count').notNull().default(0),
    errorMsg: varchar('error_msg', { length: 512 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const siloCovergenQueue = vaisseauMereAcSchema.table(
  'cs_silo_covergen_queue',
  {
    idCovergen: serial('id_covergen').primaryKey(),
    tenant: varchar('tenant', { length: 50 }).notNull().default('ac-hub'),
    idSilo: integer('id_silo').notNull(),
    kind: varchar('kind', { length: 8 }).notNull().default('product'),
    size: varchar('size', { length: 6 }).notNull().default('square'),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    status: varchar('status', { length: 10 }).notNull().default('pending'),
    coverUrl: varchar('cover_url', { length: 512 }),
    remotePath: varchar('remote_path', { length: 512 }),
    errorMsg: varchar('error_msg', { length: 512 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
