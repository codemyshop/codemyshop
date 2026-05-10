/**
 *
 * Drizzle PG schema — email client domain (persisted mailbox).
 *
 * Owns `cs_email_message` (rule 7 §DB-Only) — message storage
 * IMAP/SMTP of the hub's integrated email client (/hub/crm/email tab Mail).
 *
 * Multi-account : `account_user` discriminates mailboxes (mail@example-shop…,
 * contact@example.com, etc.) on a given Nuxt instance.
 *
 * folder='inbox' : message received via IMAP sync.
 * folder='sent'  : message sent via SMTP from the hub.
 *
 * Attachments in child table `cs_email_attachment` (BYTEA).
 */

import {
  serial, integer, smallint, timestamp, varchar, text,
  pgSchema, uniqueIndex, index,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const emailMessage = vaisseauMereAcSchema.table(
  'cs_email_message',
  {
    idEmailMessage:  serial('id_email_message').primaryKey(),
    accountUser:     varchar('account_user', { length: 255 }).notNull(),
    folder:          varchar('folder', { length: 16 }).notNull(),
    imapUid:         integer('imap_uid'),
    messageId:       varchar('message_id', { length: 500 }).notNull(),
    fromEmail:       varchar('from_email', { length: 255 }),
    fromName:        varchar('from_name', { length: 255 }),
    toEmails:        text('to_emails'),
    ccEmails:        text('cc_emails'),
    subject:         varchar('subject', { length: 998 }),
    dateReceived:    timestamp('date_received', { mode: 'date', precision: 0 }),
    bodyText:        text('body_text'),
    bodyHtml:        text('body_html'),
    hasAttachments:  smallint('has_attachments').notNull().default(0),
    isRead:          smallint('is_read').notNull().default(0),
    dateAdd:         timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd:         timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    accountMessageIdUq:  uniqueIndex('cs_email_message_account_msgid_uq').on(t.accountUser, t.messageId),
    accountFolderDateIx: index('cs_email_message_account_folder_date_ix').on(t.accountUser, t.folder, t.dateReceived),
  }),
)

export const emailAttachment = vaisseauMereAcSchema.table(
  'cs_email_attachment',
  {
    idEmailAttachment: serial('id_email_attachment').primaryKey(),
    idEmailMessage:    integer('id_email_message').notNull(),
    filename:          varchar('filename', { length: 500 }),
    mimeType:          varchar('mime_type', { length: 255 }),
    sizeBytes:         integer('size_bytes'),
    // BYTEA → côté Drizzle on stocke en TEXT base64 pour transit, mais la
    // colonne est bien BYTEA en DB. Voir endpoints download/sync pour
    // l'encodage/décodage.
    content:           text('content'),
    dateAdd:           timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    messageIx: index('cs_email_attachment_message_ix').on(t.idEmailMessage),
  }),
)
