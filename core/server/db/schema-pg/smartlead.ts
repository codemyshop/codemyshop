

import {
  integer,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const smartlead = vaisseauMereAcSchema.table(
  'cs_smartlead',
  {
    idAcSmartlead: serial('id_ac_smartlead').primaryKey(),
    idOwner: integer('id_owner'),
    imgUpload: varchar('img_upload', { length: 128 }),
    firstname: varchar('firstname', { length: 128 }),
    lastname: varchar('lastname', { length: 128 }),
    profilFb: varchar('profil_fb', { length: 255 }),
    profilLinkedin: varchar('profil_linkedIn', { length: 255 }),
    website: varchar('website', { length: 255 }),
    profession: varchar('profession', { length: 128 }),
    email: varchar('email', { length: 255 }),
    emailVerifiedStatus: varchar('email_verified_status', { length: 16 }),
    emailVerifiedAt: timestamp('email_verified_at', { mode: 'date', precision: 0 }),
    newsletter: smallint('newsletter').notNull().default(0),
    phoneWhatsapp: varchar('phone_whatsapp', { length: 32 }),
    phone: varchar('phone', { length: 32 }),
    level: integer('level'),
    type: varchar('type', { length: 11 }),
    status: varchar('status', { length: 32 }),
    leadSource: varchar('lead_source', { length: 32 }),
    leadSourceOther: varchar('lead_source_other', { length: 128 }),
    leadIntent: varchar('lead_intent', { length: 64 }),
    avatarType: varchar('avatar_type', { length: 32 }),
    companyName: varchar('company_name', { length: 255 }),
    companySize: varchar('company_size', { length: 20 }),
    annualRevenue: varchar('annual_revenue', { length: 20 }),
    prestashopVersion: varchar('prestashop_version', { length: 20 }),
    currentPain: text('current_pain'),
    note: text('note'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
)
