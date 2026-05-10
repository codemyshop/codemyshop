/**
 *
 * Drizzle PG schema — transactional email templates (parent + _lang).
 *
 * Source of truth edited from /hub/crm/email/template/[slug] :
 * - audience='client' : dynamic recipient (client email) — columns
 * recipient_* IGNORED.
 *   - audience='admin'  : destinataires lus depuis recipient_to/cc/bcc (CSV
 * split on code side), fallback env ADMIN_NOTIF_EMAIL if empty.
 *
 * The i18n content (subject + html_body + plain_body) lives in the `_lang`
 * paired. No `auto_increment` on the `_lang` (composite PK slug+id_lang).
 */

import {
  integer,
  pgSchema,
  smallint,
  text,
  timestamp,
  varchar,
  primaryKey,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const emailTemplate = vaisseauMereAcSchema.table(
  'cs_email_template',
  {
    slug:         varchar('slug',         { length: 64 }).primaryKey(),
    audience:     varchar('audience',     { length: 16 }).notNull(),
    triggerHint:  varchar('trigger_hint', { length: 255 }),
    active:       smallint('active').notNull().default(1),
    /** Priorité par défaut 0-100 (0=critique, 50=standard, 100=marketing).
     * Inherited by the cs_email_queue rows at enqueue time. */
    priority:     smallint('priority').notNull().default(50),
    recipientTo:  text('recipient_to').notNull().default(''),
    recipientCc:  text('recipient_cc').notNull().default(''),
    recipientBcc: text('recipient_bcc').notNull().default(''),
    dateAdd:      timestamp('date_add', { mode: 'date' }).notNull(),
    dateUpd:      timestamp('date_upd', { mode: 'date' }).notNull(),
  },
)

export const emailTemplateLang = vaisseauMereAcSchema.table(
  'cs_email_template_lang',
  {
    slug:        varchar('slug',        { length: 64 }).notNull(),
    idLang:      integer('id_lang').notNull(),
    subject:     varchar('subject',     { length: 255 }).notNull(),
    htmlBody:    text('html_body').notNull(),
    plainBody:   text('plain_body'),
    // BO metadata displayed in /hub/crm/email (DB-first since 2026-05-06).
    // i18n via _lang (FR for current admin BO, open to EN/DE later).
    label:       varchar('label',       { length: 128 }).notNull().default(''),
    description: text('description').notNull().default(''),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.slug, t.idLang] }),
  }),
)

export type EmailTemplateRow     = typeof emailTemplate.$inferSelect
export type EmailTemplateLangRow = typeof emailTemplateLang.$inferSelect
