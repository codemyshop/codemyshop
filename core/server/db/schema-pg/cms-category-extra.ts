

import {
  integer, primaryKey, serial, smallint, varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const cmsCategoryExtra = vaisseauMereAcSchema.table(
  'cs_cms_category_extra',
  {
    idAcCmsCategoryExtra: serial('id_ac_cms_category_extra').primaryKey(),
    idCmsCategory: integer('id_cms_category').notNull(),
    image: varchar('image', { length: 255 }),
    generateCover: smallint('generate_cover').notNull().default(0),
  },
)

export const cmsCategoryExtraLang = vaisseauMereAcSchema.table(
  'cs_cms_category_extra_lang',
  {
    idAcCmsCategoryExtra: integer('id_ac_cms_category_extra').notNull(),
    idLang: integer('id_lang').notNull(),
    h1Title: varchar('h1_title', { length: 255 }),
    imageAlt: varchar('image_alt', { length: 255 }),
    imageTitle: varchar('image_title', { length: 255 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idAcCmsCategoryExtra, t.idLang] }),
  }),
)
