

import {
  integer,
  pgSchema,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const emailQueue = vaisseauMereAcSchema.table(
  'cs_email_queue',
  {
    idAcEmailQueue: serial('id_ac_email_queue').primaryKey(),
    toEmail:        varchar('to_email',      { length: 255 }).notNull(),
    subject:        varchar('subject',       { length: 500 }).notNull(),
    htmlBody:       text('html_body').notNull(),
    plainBody:      text('plain_body'),
    fromEmail:      varchar('from_email',    { length: 255 }),
    replyTo:        varchar('reply_to',      { length: 255 }),
    templateSlug:   varchar('template_slug', { length: 64 }),
    idLang:         integer('id_lang'),
    status:         varchar('status',        { length: 16 }).notNull().default('pending'),
    

    priority:       smallint('priority').notNull().default(50),
    

    attachmentMeta: text('attachment_meta').notNull().default(''),
    attempts:       smallint('attempts').notNull().default(0),
    maxAttempts:    smallint('max_attempts').notNull().default(3),
    lastError:      text('last_error'),
    resendId:       varchar('resend_id',     { length: 64 }),
    scheduledAt:    timestamp('scheduled_at', { mode: 'date' }),
    sentAt:         timestamp('sent_at',      { mode: 'date' }),
    dateAdd:        timestamp('date_add',     { mode: 'date' }).notNull(),
    dateUpd:        timestamp('date_upd',     { mode: 'date' }).notNull(),
  },
)

export type EmailQueueRow       = typeof emailQueue.$inferSelect
export type EmailQueueInsertRow = typeof emailQueue.$inferInsert
