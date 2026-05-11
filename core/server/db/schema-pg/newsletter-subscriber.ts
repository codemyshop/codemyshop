

import {
  index,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const newsletterSubscriberVaisseau = vaisseauMereAcSchema.table(
  'cs_newsletter_subscriber',
  {
    idSubscriber: serial('id_subscriber').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    locale: varchar('locale', { length: 8 }),
    source: varchar('source', { length: 32 }).notNull().default('footer'),
    sourceUrl: varchar('source_url', { length: 512 }),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 512 }),
    consentText: text('consent_text').notNull(),
    consentAt: timestamp('consent_at', { mode: 'date' }).notNull().defaultNow(),
    confirmToken: varchar('confirm_token', { length: 64 }),
    confirmedAt: timestamp('confirmed_at', { mode: 'date' }),
    unsubscribeToken: varchar('unsubscribe_token', { length: 64 }).notNull(),
    unsubscribedAt: timestamp('unsubscribed_at', { mode: 'date' }),
    bounceReason: varchar('bounce_reason', { length: 64 }),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    uClientEmail: uniqueIndex('uk_newsletter_subscriber_client_email').on(t.clientId, t.email),
    kStatus: index('idx_newsletter_subscriber_status').on(t.clientId, t.status),
    kDate: index('idx_newsletter_subscriber_date_add').on(t.dateAdd),
    kUnsubToken: index('idx_newsletter_subscriber_unsubscribe_token').on(t.unsubscribeToken),
  }),
)

export type NewsletterSubscriberRow = typeof newsletterSubscriberVaisseau.$inferSelect
export type NewsletterSubscriberInsert = typeof newsletterSubscriberVaisseau.$inferInsert
