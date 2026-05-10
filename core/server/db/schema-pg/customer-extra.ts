/**
 *
 * Drizzle PG schema for `cs_customer_extra` — task #44 port-drizzle-mariadb-pg.
 *
 * Pattern `_extra` (CLAUDE.md rule 13 exception) : 1:1 with `ps_customer`,
 * `id_customer` is PK and FK. No polymorphism. Owned by `ac_customerextra`.
 *
 * `activity_code` is a B2B semantic code (gms, chr, distributor, …) — mapping
 * on the code side in `core/utils/customerActivity.ts`.
 *
 * Mapping types MariaDB -> PG :
 *   - INT (PK 1:1) -> integer().primaryKey()
 *   - VARCHAR(32)  -> varchar({ length: 32 })
 *   - DATETIME     -> timestamp(0) without time zone
 */

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
