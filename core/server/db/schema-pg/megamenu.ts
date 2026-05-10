/**
 *
 * Drizzle PG schema — megamenu domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer, primaryKey, serial, smallint, text, timestamp, uniqueIndex, varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const megamenu = vaisseauMereAcSchema.table(
  'cs_megamenu',
  {
    idMegamenu: serial('id_megamenu').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull().default('ac-hub'),
    parentId: integer('parent_id'),
    type: varchar('type', { length: 16 }).notNull().default('link'),
    href: varchar('href', { length: 512 }),
    icon: varchar('icon', { length: 255 }),
    styleJson: text('style_json'),
    gridColumns: integer('grid_columns'),
    cssClass: varchar('css_class', { length: 128 }),
    psCategoryId: integer('ps_category_id'),
    showPsChildren: smallint('show_ps_children').notNull().default(0),
    position: integer('position').notNull().default(0),
    active: smallint('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const megamenuLang = vaisseauMereAcSchema.table(
  'cs_megamenu_lang',
  {
    idMegamenu: integer('id_megamenu').notNull(),
    idLang: integer('id_lang').notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    description: varchar('description', { length: 500 }),
    badge: varchar('badge', { length: 64 }),
    groupTitle: varchar('group_title', { length: 255 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idMegamenu, t.idLang] }),
    ukMegamenuLang: uniqueIndex('uk_megamenu_lang').on(t.idMegamenu, t.idLang),
  }),
)
