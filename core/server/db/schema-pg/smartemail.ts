

import {
  integer,
  serial,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const smartemail = vaisseauMereAcSchema.table(
  'cs_smartemail',
  {
    idAcSmartemail: serial('id_ac_smartemail').primaryKey(),
    idOwner: integer('id_owner').notNull(),
    idAcSmartproject: integer('id_ac_smartproject'),
    idAcSmartlead: integer('id_ac_smartlead'),
    idCustomer: integer('id_customer'),
    emailTitle: varchar('email_title', { length: 255 }).notNull(),
    emailMessage: text('email_message'),
    emailSignature: text('email_signature'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)
