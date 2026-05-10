/**
 *
 * Drizzle PG schema — email-config domain (singleton cs_email_config).
 * Voir migration 2026-05-05_email_config.sql.
 */

import {
  integer,
  pgSchema,
  smallint,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const emailConfig = vaisseauMereAcSchema.table(
  'cs_email_config',
  {
    idEmailConfig: smallint('id_email_config').primaryKey().default(1),
    smtpHost:    varchar('smtp_host',   { length: 255 }),
    smtpPort:    integer('smtp_port'),
    smtpUser:    varchar('smtp_user',   { length: 255 }),
    smtpFrom:    varchar('smtp_from',   { length: 255 }),
    smtpSecure:  smallint('smtp_secure').notNull().default(1),
    fromEmail:   varchar('from_email',  { length: 255 }),
    replyTo:     varchar('reply_to',    { length: 255 }),
    dateAdd:     timestamp('date_add',  { mode: 'date' }).notNull(),
    dateUpd:     timestamp('date_upd',  { mode: 'date' }).notNull(),
  },
)

export type EmailConfigRow = typeof emailConfig.$inferSelect
