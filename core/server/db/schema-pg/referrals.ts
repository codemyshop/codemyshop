

import {
  serial,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const referrals = vaisseauMereAcSchema.table(
  'cs_referrals',
  {
    idReferral: serial('id_referral').primaryKey(),
    refUuid: varchar('ref_uuid', { length: 36 }).notNull(),
    type: varchar('type', { length: 32 }).notNull().default('ambassador_application'),
    name: varchar('name', { length: 128 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    activity: varchar('activity', { length: 255 }).notNull().default(''),
    network: varchar('network', { length: 255 }),
    status: varchar('status', { length: 8 }).notNull().default('pending'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
