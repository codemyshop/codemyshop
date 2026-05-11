

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

export const giftcardVaisseau = vaisseauMereAcSchema.table(
  'cs_giftcard',
  {
    idGiftcard: serial('id_giftcard').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    code: varchar('code', { length: 32 }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    balanceCents: integer('balance_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    deliveryMode: varchar('delivery_mode', { length: 16 }).notNull().default('pdf'),
    purchaserName: varchar('purchaser_name', { length: 128 }).notNull(),
    purchaserEmail: varchar('purchaser_email', { length: 255 }).notNull(),
    recipientName: varchar('recipient_name', { length: 128 }),
    recipientEmail: varchar('recipient_email', { length: 255 }),
    personalMessage: text('personal_message'),
    scheduledSendAt: timestamp('scheduled_send_at', { mode: 'date' }),
    idOrder: integer('id_order'),
    pdfToken: varchar('pdf_token', { length: 64 }).notNull(),
    purchasedAt: timestamp('purchased_at', { mode: 'date' }),
    sentAt: timestamp('sent_at', { mode: 'date' }),
    redeemedAt: timestamp('redeemed_at', { mode: 'date' }),
    idRedemptionOrder: integer('id_redemption_order'),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    uClientCode: uniqueIndex('uk_giftcard_client_code').on(t.clientId, t.code),
    kStatus: index('idx_giftcard_status').on(t.clientId, t.status),
    kDateAdd: index('idx_giftcard_date_add').on(t.dateAdd),
    kPdfToken: index('idx_giftcard_pdf_token').on(t.pdfToken),
  }),
)

export type GiftcardRow = typeof giftcardVaisseau.$inferSelect
export type GiftcardInsert = typeof giftcardVaisseau.$inferInsert
