

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

export const seo404 = vaisseauMereAcSchema.table(
  'cs_seo404',
  {
    idAcSeo404: serial('id_ac_seo404').primaryKey(),
    url: varchar('url', { length: 512 }).notNull(),
    ip: varchar('ip', { length: 45 }).notNull(),
    userAgent: text('user_agent'),
    pageType: varchar('page_type', { length: 50 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)

export const seourls = vaisseauMereAcSchema.table(
  'cs_seourls',
  {
    idAcSeourls: serial('id_ac_seourls').primaryKey(),
    entityType: varchar('entity_type', { length: 32 }).notNull(),
    idEntity: integer('id_entity').notNull(),
    idLang: integer('id_lang').notNull(),
    oldUrl: text('old_url').notNull(),
    newUrl: text('new_url'),
    isProcessed: smallint('is_processed'),
  },
)
