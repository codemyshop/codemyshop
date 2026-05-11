

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

export const veilleDigests = vaisseauMereAcSchema.table(
  'cs_veille_digests',
  {
    idDigest: serial('id_digest').primaryKey(),
    weekNum: smallint('week_num').notNull(),
    year: smallint('year').notNull(),
    type: varchar('type', { length: 32 }).notNull(),
    content: text('content').notNull(),
    signalCount: integer('signal_count').notNull().default(0),
    highCount: integer('high_count').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const veilleSignals = vaisseauMereAcSchema.table(
  'cs_veille_signals',
  {
    idSignal: serial('id_signal').primaryKey(),
    front: varchar('front', { length: 32 }).notNull(),
    source: varchar('source', { length: 128 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    url: varchar('url', { length: 1000 }),
    author: varchar('author', { length: 128 }),
    publication: varchar('publication', { length: 128 }),
    summary: text('summary'),
    emailSubject: varchar('email_subject', { length: 500 }),
    relevance: varchar('relevance', { length: 16 }).notNull().default('moyenne'),
    keywords: varchar('keywords', { length: 500 }),
    action: varchar('action', { length: 32 }),
    impact: varchar('impact', { length: 32 }),
    readTime: varchar('read_time', { length: 16 }),
    dateSignal: timestamp('date_signal', { mode: 'date', precision: 0 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    weekNum: smallint('week_num'),
  },
)
