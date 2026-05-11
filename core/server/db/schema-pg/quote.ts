

import {
  date,
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

export const quoteVaisseau = vaisseauMereAcSchema.table(
  'cs_quote',
  {
    idQuote: serial('id_quote').primaryKey(),
    idInvoiceClient: integer('id_invoice_client').notNull(),
    number: varchar('number', { length: 32 }).notNull(),
    issueDate: date('issue_date', { mode: 'string' }).notNull(),
    validUntil: date('valid_until', { mode: 'string' }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    executionPeriod: varchar('execution_period', { length: 128 }),
    description: text('description'),
    amountHt: numeric('amount_ht', { precision: 10, scale: 2 }).notNull().default('0'),
    amountVat: numeric('amount_vat', { precision: 10, scale: 2 }).notNull().default('0'),
    amountTtc: numeric('amount_ttc', { precision: 10, scale: 2 }).notNull().default('0'),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('0'),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    status: varchar('status', { length: 16 })
      .$type<'draft' | 'sent' | 'accepted' | 'refused' | 'expired'>()
      .notNull()
      .default('draft'),
    createsSubscription: integer('creates_subscription').notNull().default(0),
    subscriptionCycle: varchar('subscription_cycle', { length: 16 })
      .$type<'monthly' | 'quarterly' | 'yearly' | null>(),
    subscriptionMonths: integer('subscription_months'),
    acceptedAt: timestamp('accepted_at', { mode: 'date' }),
    refusedAt: timestamp('refused_at', { mode: 'date' }),
    pdfPath: varchar('pdf_path', { length: 512 }),
    sentAt: timestamp('sent_at', { mode: 'date' }),
    sentTo: varchar('sent_to', { length: 512 }),
    acceptToken: varchar('accept_token', { length: 64 }),
    tiimeQuoteId: varchar('tiime_quote_id', { length: 64 }),
    notes: text('notes'),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    uNumber: uniqueIndex('uk_quote_number').on(t.number),
    kClient: index('idx_quote_client').on(t.idInvoiceClient),
    kStatus: index('idx_quote_status').on(t.status),
    kIssue: index('idx_quote_issue').on(t.issueDate),
    kToken: index('idx_quote_token').on(t.acceptToken),
  }),
)

export const quoteLineVaisseau = vaisseauMereAcSchema.table(
  'cs_quote_line',
  {
    idQuoteLine: serial('id_quote_line').primaryKey(),
    idQuote: integer('id_quote').notNull(),
    position: integer('position').notNull().default(0),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
    unitPriceHt: numeric('unit_price_ht', { precision: 10, scale: 2 }).notNull().default('0'),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('0'),
    amountHt: numeric('amount_ht', { precision: 10, scale: 2 }).notNull().default('0'),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    kQuote: index('idx_quote_line_quote').on(t.idQuote),
  }),
)

export type QuotePgRow = typeof quoteVaisseau.$inferSelect
export type QuoteLinePgRow = typeof quoteLineVaisseau.$inferSelect
