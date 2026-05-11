

import { index, integer, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const customerExtraVaisseau = vaisseauMereAcSchema.table(
  'cs_customer_extra',
  {
    idCustomer: integer('id_customer').primaryKey(),
    activityCode: varchar('activity_code', { length: 32 }),
    legalName: varchar('legal_name', { length: 255 }),
    emailVerifiedStatus: varchar('email_verified_status', { length: 16 }),
    emailVerifiedAt: timestamp('email_verified_at', { mode: 'date', precision: 0 }),
    linkedinUrl: varchar('linkedin_url', { length: 255 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    kActivity: index('activity_code').on(t.activityCode),
  }),
)

export type CustomerExtraPgRow = typeof customerExtraVaisseau.$inferSelect
export type CustomerExtraPgInsert = typeof customerExtraVaisseau.$inferInsert
