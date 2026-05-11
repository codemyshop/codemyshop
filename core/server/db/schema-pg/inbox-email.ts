

import {
  integer, smallint, timestamp, varchar, text, serial,
  pgSchema, uniqueIndex,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const inboxEmail = vaisseauMereAcSchema.table(
  'cs_inbox_emails',
  {
    idEmail:        serial('id_email').primaryKey(),
    imapId:         varchar('imap_id', { length: 255 }).notNull(),
    fromEmail:      varchar('from_email', { length: 255 }).notNull(),
    fromName:       varchar('from_name', { length: 255 }),
    subject:        varchar('subject', { length: 500 }),
    dateReceived:   timestamp('date_received', { mode: 'date', precision: 0 }),
    clientName:     varchar('client_name', { length: 100 }),
    clientPriority: varchar('client_priority', { length: 20 }),
    mrr:            integer('mrr'),
    isBug:          smallint('is_bug').default(0),
    bugKeyword:     varchar('bug_keyword', { length: 100 }),
    aiSeverity:     varchar('ai_severity', { length: 20 }),
    aiSummary:      text('ai_summary'),
    archivePath:    varchar('archive_path', { length: 500 }),
    status:         varchar('status', { length: 11 }).notNull().default('new'),
    treatedBy:      varchar('treated_by', { length: 100 }),
    treatedAt:      timestamp('treated_at', { mode: 'date', precision: 0 }),
    notes:          text('notes'),
    createdAt:      timestamp('created_at', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    updatedAt:      timestamp('updated_at', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    imapIdUq: uniqueIndex('cs_inbox_emails_imap_id_uq').on(t.imapId),
  }),
)
