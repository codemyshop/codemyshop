

import {
  index,
  integer,
  numeric,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export type LeadqualSegment = 'low' | 'mid' | 'elite'
export type LeadqualStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

export const leadqualVaisseau = vaisseauMereAcSchema.table(
  'cs_leadqual',
  {
    idLeadqual: serial('id_leadqual').primaryKey(),
    leadId: varchar('lead_id', { length: 128 }).notNull(),
    companyName: varchar('company_name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    estimatedRevenue: numeric('estimated_revenue', { precision: 15, scale: 2 }).notNull().default('0'),
    segment: varchar('segment', { length: 5 }).$type<LeadqualSegment>().notNull().default('low'),
    segmentLabel: varchar('segment_label', { length: 64 }).notNull().default('Segment Low-Tier'),
    score: integer('score').notNull().default(0),
    source: varchar('source', { length: 128 }),
    needs: text('needs'),
    notes: text('notes'),
    status: varchar('status', { length: 9 }).$type<LeadqualStatus>().notNull().default('new'),
    idAcSmartlead: integer('id_ac_smartlead'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    uLeadId: uniqueIndex('idx_lead_id').on(t.leadId),
    kSegment: index('idx_segment').on(t.segment),
    kStatus: index('idx_status').on(t.status),
    kRevenue: index('idx_estimated_revenue').on(t.estimatedRevenue),
  }),
)

export type LeadqualPgRow = typeof leadqualVaisseau.$inferSelect
export type LeadqualPgInsert = typeof leadqualVaisseau.$inferInsert
