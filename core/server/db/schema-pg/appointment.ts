

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

export const appointmentAvailability = vaisseauMereAcSchema.table(
  'cs_appointment_availability',
  {
    idAvailability: serial('id_availability').primaryKey(),
    dateStart: timestamp('date_start', { mode: 'date', precision: 0 }).notNull(),
    durationMin: integer('duration_min').notNull().default(30),
    isBooked: smallint('is_booked').notNull().default(0),
    notes: varchar('notes', { length: 255 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const appointment = vaisseauMereAcSchema.table(
  'cs_appointment',
  {
    idAppointment: serial('id_appointment').primaryKey(),
    idAvailability: integer('id_availability').notNull(),
    idAcSmartlead: integer('id_ac_smartlead'),
    prospectName: varchar('prospect_name', { length: 200 }).notNull(),
    prospectEmail: varchar('prospect_email', { length: 200 }).notNull(),
    prospectPhone: varchar('prospect_phone', { length: 50 }),
    prospectMessage: text('prospect_message'),
    prospectSiret: varchar('prospect_siret', { length: 14 }),
    prospectCompany: varchar('prospect_company', { length: 255 }),
    prospectCompanyCity: varchar('prospect_company_city', { length: 255 }),
    prospectLegalForm: varchar('prospect_legal_form', { length: 255 }),
    dateAppointment: timestamp('date_appointment', { mode: 'date', precision: 0 }).notNull(),
    durationMin: integer('duration_min').notNull().default(30),
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
