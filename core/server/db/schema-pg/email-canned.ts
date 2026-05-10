/**
 *
 * Drizzle PG schema — predefined message templates + account signature.
 * Owns `cs_email_canned` and `cs_email_signature` (rule 7 §DB-Only).
 *
 * Multi-account : `account_user` discrimine. Signature en singleton par
 * compte (UNIQUE(account_user)).
 */

import {
  serial, smallint, timestamp, varchar, text,
  pgSchema, index,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const emailCanned = vaisseauMereAcSchema.table(
  'cs_email_canned',
  {
    idEmailCanned: serial('id_email_canned').primaryKey(),
    accountUser:   varchar('account_user', { length: 255 }).notNull(),
    label:         varchar('label', { length: 255 }).notNull(),
    subject:       varchar('subject', { length: 500 }),
    body:          text('body'),
    position:      smallint('position').notNull().default(0),
    active:        smallint('active').notNull().default(1),
    dateAdd:       timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd:       timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    accountIx: index('cs_email_canned_account_ix').on(t.accountUser, t.position),
  }),
)

export const emailSignature = vaisseauMereAcSchema.table(
  'cs_email_signature',
  {
    idEmailSignature: serial('id_email_signature').primaryKey(),
    accountUser:      varchar('account_user', { length: 255 }).notNull().unique(),
    bodyText:         text('body_text'),
    bodyHtml:         text('body_html'),
    dateAdd:          timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd:          timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
