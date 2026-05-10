/**
 *
 * Drizzle PG schema — brand-watch domain.
 * SERP monitoring of proprietary systems.
 * Database-only port of brand-watch module + hard-coded WATCH_TERMS
 * + synedre/reports/brand-watch.json (chantier #43 Wave 2).
 */

import {
  integer,
  pgSchema,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const brandWatchTerm = vaisseauMereAcSchema.table(
  'cs_brand_watch_term',
  {
    idTerm:            serial('id_term').primaryKey(),
    term:              varchar('term', { length: 255 }).notNull().unique(),
    invention:         varchar('invention', { length: 255 }).notNull().default(''),
    active:            smallint('active').notNull().default(1),
    position:          integer('position').notNull().default(0),
    lastCheck:         timestamp('last_check', { mode: 'date', precision: 0 }),
    totalResults:      integer('total_results').notNull().default(0),
    ourResults:        integer('our_results').notNull().default(0),
    competitorResults: integer('competitor_results').notNull().default(0),
    dateAdd:           timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd:           timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const brandWatchCompetitor = vaisseauMereAcSchema.table(
  'cs_brand_watch_competitor',
  {
    idCompetitor: serial('id_competitor').primaryKey(),
    idTerm:       integer('id_term').notNull(),
    domain:       varchar('domain', { length: 255 }).notNull(),
    url:          text('url').notNull().default(''),
    firstSeen:    timestamp('first_seen', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    lastSeen:     timestamp('last_seen', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateAdd:      timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd:      timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    termDomainUnique: unique().on(t.idTerm, t.domain),
  }),
)
