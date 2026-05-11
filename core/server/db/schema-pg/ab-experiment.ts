

import {
  integer,
  numeric,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const abExperiment = vaisseauMereAcSchema.table(
  'cs_ab_experiment',
  {
    idExperiment: serial('id_experiment').primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull(),
    idProduct: integer('id_product'),
    status: varchar('status', { length: 16 }).notNull().default('draft'),
    trafficSplit: smallint('traffic_split').notNull().default(50),
    variantA: text('variant_a').notNull(),
    variantB: text('variant_b').notNull(),
    viewsA: integer('views_a').notNull().default(0),
    viewsB: integer('views_b').notNull().default(0),
    conversionsA: integer('conversions_a').notNull().default(0),
    conversionsB: integer('conversions_b').notNull().default(0),
    revenueA: numeric('revenue_a', { precision: 20, scale: 2 }).notNull().default('0.00'),
    revenueB: numeric('revenue_b', { precision: 20, scale: 2 }).notNull().default('0.00'),
    winningVariant: varchar('winning_variant', { length: 1 }),
    dateStart: timestamp('date_start', { mode: 'date', precision: 0 }),
    dateEnd: timestamp('date_end', { mode: 'date', precision: 0 }),
    notes: text('notes'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
