

import {
  bigserial,
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

export const bankAccountVaisseau = vaisseauMereAcSchema.table(
  'cs_bank_accounts',
  {
    idBankAccount: serial('id_bank_account').primaryKey(),
    provider: varchar('provider', { length: 16 })
      .$type<'n26_direct' | 'powens' | 'bridge' | 'manual'>()
      .notNull(),
    label: varchar('label', { length: 128 }).notNull(),
    ibanLast4: varchar('iban_last4', { length: 8 }),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    credentialsRef: varchar('credentials_ref', { length: 64 }),
    lastSyncAt: timestamp('last_sync_at', { mode: 'date' }),
    lastSyncStatus: varchar('last_sync_status', { length: 8 })
      .$type<'ok' | 'error' | 'never'>()
      .notNull()
      .default('never'),
    lastSyncError: text('last_sync_error'),
    backfillSince: date('backfill_since', { mode: 'string' }),
    active: integer('active').notNull().default(1),
    notes: text('notes'),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    kProvider: index('idx_bank_accounts_provider').on(t.provider),
    kActive: index('idx_bank_accounts_active').on(t.active),
  }),
)

export const bankTransactionVaisseau = vaisseauMereAcSchema.table(
  'cs_bank_transactions',
  {
    idBankTransaction: bigserial('id_bank_transaction', { mode: 'number' }).primaryKey(),
    idBankAccount: integer('id_bank_account').notNull(),
    externalId: varchar('external_id', { length: 128 }).notNull(),
    bookingDate: date('booking_date', { mode: 'string' }).notNull(),
    valueDate: date('value_date', { mode: 'string' }),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    description: varchar('description', { length: 512 }),
    counterpartyName: varchar('counterparty_name', { length: 256 }),
    counterpartyIban: varchar('counterparty_iban', { length: 64 }),
    categoryHint: varchar('category_hint', { length: 64 }),
    category: varchar('category', { length: 64 }),
    isProfessional: integer('is_professional'),
    reconciled: integer('reconciled').notNull().default(0),
    reconciledRef: varchar('reconciled_ref', { length: 128 }),
    rawJson: text('raw_json'),
    notes: text('notes'),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    uAccountExternal: uniqueIndex('uk_bank_account_external').on(t.idBankAccount, t.externalId),
    kBooking: index('idx_bank_tx_booking').on(t.bookingDate),
    kReconciled: index('idx_bank_tx_reconciled').on(t.reconciled),
    kAccount: index('idx_bank_tx_account').on(t.idBankAccount),
    kCategory: index('idx_bank_tx_category').on(t.category),
    kIsPro: index('idx_bank_tx_is_pro').on(t.isProfessional),
  }),
)

export type BankAccountPgRow = typeof bankAccountVaisseau.$inferSelect
export type BankTransactionPgRow = typeof bankTransactionVaisseau.$inferSelect
