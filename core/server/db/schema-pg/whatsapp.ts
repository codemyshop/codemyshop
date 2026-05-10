/**
 *
 * Drizzle PG schema — WhatsApp domain.
 * Generated 2026-05-01 (php-eviction-phase2) from live PG information_schema.
 */

import {
  integer, primaryKey, serial, smallint, text, timestamp, varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const whatsappMessage = vaisseauMereAcSchema.table(
  'cs_whatsapp_message',
  {
    idAcWhatsappMessage: serial('id_ac_whatsapp_message').primaryKey(),
    idCustomer: integer('id_customer'),
    idAcSmartlead: integer('id_ac_smartlead'),
    idAcSmartproject: integer('id_ac_smartproject'),
    waId: varchar('wa_id', { length: 50 }).notNull(),
    customerName: varchar('customer_name', { length: 255 }),
    messageBody: text('message_body'),
    projectRef: varchar('project_ref', { length: 100 }),
    jsonRaw: text('json_raw'),
    isAdmin: smallint('is_admin').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
  },
)

export const whatsappTemplate = vaisseauMereAcSchema.table(
  'cs_whatsapp_template',
  {
    idAcWhatsappTemplate: serial('id_ac_whatsapp_template').primaryKey(),
    idOwner: integer('id_owner').notNull(),
    type: varchar('type', { length: 20 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)

export const whatsappTemplateLang = vaisseauMereAcSchema.table(
  'cs_whatsapp_template_lang',
  {
    idAcWhatsappTemplate: integer('id_ac_whatsapp_template').notNull(),
    idLang: integer('id_lang').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    messageBody: text('message_body').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idAcWhatsappTemplate, t.idLang] }),
  }),
)
