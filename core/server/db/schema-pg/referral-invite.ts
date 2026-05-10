/**
 *
 * Drizzle PG schema for `cs_referral_invite` — project #44 port-drizzle-mariadb-pg.
 *
 * Invitations referral MGM (programme Phase 3 Flywheel). Distinct de
 * `cs_referrals` (ambassador applications). Owned by `ac_referralinvite`.
 *
 * Mapping types MariaDB -> PG :
 *   - INT AUTO_INCREMENT          -> serial
 *   - ENUM('invited'…'deployed')  -> varchar(8) + $type<ReferralInviteStatus>
 *   - DATETIME                    -> timestamp(0) without time zone
 */

import { index, pgSchema, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export type ReferralInviteStatus = 'invited' | 'audit' | 'deployed'

export const referralInviteVaisseau = vaisseauMereAcSchema.table(
  'cs_referral_invite',
  {
    idReferralInvite: serial('id_referral_invite').primaryKey(),
    referrerId: varchar('referrer_id', { length: 64 }).notNull(),
    referrerName: varchar('referrer_name', { length: 128 }).notNull(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    message: text('message'),
    status: varchar('status', { length: 8 }).$type<ReferralInviteStatus>().notNull().default('invited'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    kReferrer: index('idx_referrer').on(t.referrerId),
    kStatus: index('idx_status').on(t.status),
    kEmail: index('idx_email').on(t.contactEmail),
  }),
)

export type ReferralInvitePgRow = typeof referralInviteVaisseau.$inferSelect
export type ReferralInvitePgInsert = typeof referralInviteVaisseau.$inferInsert
