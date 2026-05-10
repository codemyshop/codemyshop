/**
 *
 * ac_headlesscontact facade — headless B2B contact form messages.
 *
 * Surface :
 *  - insertContactMessage (POST /api/contact)
 *
 * Note: `bo/leads/index.get.ts` consumes the table in UNION with cs_smartlead
 * — this consumer remains driven by the smartlead domain (cross-domain join),
 * not by this facade.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface HeadlesscontactContext {
  event?: any
  clientId?: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function db(_ctx: HeadlesscontactContext = {}) {
  return usePocPg()
}

export interface ContactMessageInput {
  company: string | null
  siret: string | null
  name: string
  email: string
  phone: string | null
  message: string
  ipAddress: string | null
  userAgent: string | null
  emailVerifiedStatus?: string | null
}

export async function insertContactMessage(
  input: ContactMessageInput,
  ctx: HeadlesscontactContext = {},
): Promise<number> {
  const d = db(ctx)
  const ins = await d.execute<any>(sql`
    INSERT INTO cs_main.cs_headlesscontact_message
      (company, siret, name, email, phone, message, ip_address, user_agent,
       status, email_verified_status, email_verified_at, date_add, date_upd)
    VALUES
      (${input.company}, ${input.siret}, ${input.name}, ${input.email}, ${input.phone},
       ${input.message}, ${input.ipAddress}, ${input.userAgent}, 'new',
       ${input.emailVerifiedStatus ?? null},
       ${input.emailVerifiedStatus ? sql`CURRENT_TIMESTAMP` : sql`NULL`},
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id_message AS "id"
  `)
  return Number(((ins as any) as any[])[0]?.id ?? 0)
}
