

import {
  index,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const crosslinksVaisseau = vaisseauMereAcSchema.table(
  'cs_crosslinks',
  {
    idCrosslink: serial('id_crosslink').primaryKey(),
    linkRewrite: varchar('link_rewrite', { length: 255 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    pilier: varchar('pilier', { length: 64 }).notNull(),
    sousCat: varchar('sous_cat', { length: 64 }).notNull(),
    sameSubcat: text('same_subcat'),
    samePillar: text('same_pillar'),
    crossPillar: text('cross_pillar'),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    uLink: uniqueIndex('idx_crosslinks_link_rewrite').on(t.linkRewrite),
    kPilier: index('idx_crosslinks_pilier').on(t.pilier),
    kSousCat: index('idx_crosslinks_sous_cat').on(t.sousCat),
  }),
)
