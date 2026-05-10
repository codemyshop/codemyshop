/**
 *
 * Drizzle PG schema for subscription — project #38 Phase 1 step 4.
 * 1 table (cs_main, AC-only) : cs_subscription.
 */

import {
  date,
  index,
  integer,
  numeric,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const subscriptionVaisseau = vaisseauMereAcSchema.table(
  'cs_subscription',
  {
    idSubscription: serial('id_subscription').primaryKey(),
    idInvoiceClient: integer('id_invoice_client').notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    description: text('description'),
    cycle: varchar('cycle', { length: 16 })
      .$type<'monthly' | 'quarterly' | 'yearly'>()
      .notNull()
      .default('monthly'),
    autoInvoiceDay: integer('auto_invoice_day').notNull().default(1),
    executionOffsetMonths: integer('execution_offset_months').notNull().default(0),
    amountHt: numeric('amount_ht', { precision: 10, scale: 2 }).notNull(),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('0'),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
    status: varchar('status', { length: 16 })
      .$type<'active' | 'paused' | 'cancelled' | 'ended'>()
      .notNull()
      .default('active'),
    lastInvoicedAt: date('last_invoiced_at', { mode: 'string' }),
    quoteId: integer('quote_id'),
    notes: text('notes'),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    kClient: index('idx_subscription_client').on(t.idInvoiceClient),
    kStatus: index('idx_subscription_status').on(t.status),
    kDay: index('idx_subscription_day').on(t.autoInvoiceDay),
  }),
)

export type SubscriptionPgRow = typeof subscriptionVaisseau.$inferSelect
