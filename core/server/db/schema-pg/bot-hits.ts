

import {
  index,
  integer,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const botHitsVaisseau = vaisseauMereAcSchema.table(
  'cs_bot_hits',
  {
    idHit: serial('id_hit').primaryKey(),
    bot: varchar('bot', { length: 64 }).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    status: integer('status').notNull().default(200),
    ip: varchar('ip', { length: 45 }).notNull().default(''),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    kBot: index('idx_bot_hits_bot').on(t.bot),
    kDate: index('idx_bot_hits_date_add').on(t.dateAdd),
  }),
)
