/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Helpers referrals MGM — Phase 9b.4c chantier headless-modules-ts.
 * Drizzle PG direct on `cs_referral_invite` (project #44 MariaDB → PostgreSQL cutover).
 *
 * Workflow: invited → audit → deployed. If deployed, RevShare 15% (management
 * in ac_subscription via id_referrer + lookup).
 */

import { eq, sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { referralInviteVaisseau, type ReferralInvitePgRow } from '../db/schema-pg/referral-invite'

export type ReferralStatus = 'invited' | 'audit' | 'deployed'

export interface Referral {
  id: number
  referrerId: string
  referrerName: string
  companyName: string
  contactEmail: string
  message?: string
  status: ReferralStatus
  createdAt: string
  updatedAt: string
}

function toIso(d: Date | string | null | undefined): string {
  if (!d) return ''
  return typeof d === 'string' ? d : d.toISOString()
}

function rowToReferral(r: ReferralInvitePgRow): Referral {
  return {
    id: Number(r.idReferralInvite),
    referrerId: r.referrerId,
    referrerName: r.referrerName,
    companyName: r.companyName,
    contactEmail: r.contactEmail,
    message: r.message ?? undefined,
    status: r.status as ReferralStatus,
    createdAt: toIso(r.dateAdd),
    updatedAt: toIso(r.dateUpd),
  }
}

export async function readReferrals(_event?: any): Promise<Referral[]> {
  const d = usePocPg()
  const rows = await d.select().from(referralInviteVaisseau).orderBy(sql`date_add DESC`)
  return (rows as ReferralInvitePgRow[]).map(rowToReferral)
}

export async function readReferralsByReferrer(referrerId: string, _event?: any): Promise<Referral[]> {
  if (!referrerId) return []
  const d = usePocPg()
  const rows = await d
    .select()
    .from(referralInviteVaisseau)
    .where(eq(referralInviteVaisseau.referrerId, referrerId))
    .orderBy(sql`date_add DESC`)
  return (rows as ReferralInvitePgRow[]).map(rowToReferral)
}

export interface CreateReferralInput {
  referrerId: string
  referrerName: string
  companyName: string
  contactEmail: string
  message?: string
}

export async function createReferral(input: CreateReferralInput, _event?: any): Promise<Referral> {
  const referrerId = (input.referrerId || '').trim().slice(0, 64)
  const referrerName = (input.referrerName || '').trim().slice(0, 128)
  const companyName = (input.companyName || '').trim().slice(0, 255)
  const contactEmail = (input.contactEmail || '').trim().slice(0, 255)
  const message = (input.message ?? '').trim() || null

  if (!referrerId) throw new Error('referrerId requis')
  if (!companyName) throw new Error('companyName requis')
  if (!contactEmail) throw new Error('contactEmail requis')

  const d = usePocPg()
  const ins: any = await d.execute(sql`
    INSERT INTO cs_main.cs_referral_invite
      (referrer_id, referrer_name, company_name, contact_email, message, status, date_add, date_upd)
    VALUES
      (${referrerId}, ${referrerName}, ${companyName}, ${contactEmail}, ${message}, 'invited', NOW(), NOW())
    RETURNING id_referral_invite
  `)
  const lastId = Number(ins?.[0]?.id_referral_invite || 0)
  if (lastId <= 0) throw new Error('INSERT cs_referral_invite KO')

  return {
    id: lastId,
    referrerId,
    referrerName,
    companyName,
    contactEmail,
    message: message ?? undefined,
    status: 'invited',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function updateReferralStatus(
  id: number,
  status: ReferralStatus,
  _event?: any,
): Promise<boolean> {
  if (id <= 0) return false
  const d = usePocPg()
  await d.execute(sql`
    UPDATE cs_main.cs_referral_invite
       SET status = ${status}, date_upd = NOW()
     WHERE id_referral_invite = ${id}
  `)
  return true
}
