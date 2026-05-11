

import { sql } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { usePocPg } from '~/server/db/drizzle-pg'

export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed' | 'bounced'

export interface NewsletterSubscriberRow {
  id_subscriber: number
  client_id: string
  email: string
  status: SubscriberStatus
  locale: string | null
  source: string
  source_url: string | null
  ip: string | null
  user_agent: string | null
  consent_at: string
  confirmed_at: string | null
  unsubscribe_token: string
  unsubscribed_at: string | null
  bounce_reason: string | null
  date_add: string
  date_upd: string
}

export interface UpsertSubscriberInput {
  clientId: string
  email: string
  locale?: string | null
  source?: string
  sourceUrl?: string | null
  ip?: string | null
  userAgent?: string | null
  consentText: string
  status?: SubscriberStatus
}

export interface UpsertSubscriberResult {
  idSubscriber: number
  status: SubscriberStatus
  
  created: boolean
  
  reactivated: boolean
  unsubscribeToken: string
}

export function generateToken(): string {
  return randomBytes(24).toString('hex')
}

export async function upsertSubscriber(input: UpsertSubscriberInput): Promise<UpsertSubscriberResult> {
  const email = String(input.email || '').trim().toLowerCase()
  if (!email) throw new Error('email required')
  const status: SubscriberStatus = input.status ?? 'pending'
  const unsubscribeToken = generateToken()

  const result = await usePocPg().execute<any>(sql`
    INSERT INTO cs_main.cs_newsletter_subscriber
      (client_id, email, status, locale, source, source_url, ip, user_agent,
       consent_text, consent_at, unsubscribe_token, date_add, date_upd)
    VALUES (
      ${input.clientId}, ${email}, ${status}, ${input.locale ?? null},
      ${input.source ?? 'footer'}, ${input.sourceUrl ?? null},
      ${input.ip ?? null}, ${input.userAgent ?? null},
      ${input.consentText}, NOW(), ${unsubscribeToken}, NOW(), NOW()
    )
    ON CONFLICT (client_id, lower(email)) DO UPDATE SET
      status            = CASE
        WHEN cs_newsletter_subscriber.status = 'unsubscribed' THEN EXCLUDED.status
        ELSE cs_newsletter_subscriber.status
      END,
      locale            = COALESCE(EXCLUDED.locale, cs_newsletter_subscriber.locale),
      source            = CASE
        WHEN cs_newsletter_subscriber.status = 'unsubscribed' THEN EXCLUDED.source
        ELSE cs_newsletter_subscriber.source
      END,
      source_url        = COALESCE(EXCLUDED.source_url, cs_newsletter_subscriber.source_url),
      ip                = COALESCE(EXCLUDED.ip, cs_newsletter_subscriber.ip),
      user_agent        = COALESCE(EXCLUDED.user_agent, cs_newsletter_subscriber.user_agent),
      consent_text      = CASE
        WHEN cs_newsletter_subscriber.status = 'unsubscribed' THEN EXCLUDED.consent_text
        ELSE cs_newsletter_subscriber.consent_text
      END,
      consent_at        = CASE
        WHEN cs_newsletter_subscriber.status = 'unsubscribed' THEN NOW()
        ELSE cs_newsletter_subscriber.consent_at
      END,
      unsubscribe_token = CASE
        WHEN cs_newsletter_subscriber.status = 'unsubscribed' THEN EXCLUDED.unsubscribe_token
        ELSE cs_newsletter_subscriber.unsubscribe_token
      END,
      unsubscribed_at   = CASE
        WHEN cs_newsletter_subscriber.status = 'unsubscribed' THEN NULL
        ELSE cs_newsletter_subscriber.unsubscribed_at
      END,
      date_upd          = NOW()
    RETURNING
      id_subscriber,
      status,
      unsubscribe_token,
      (xmax = 0) AS inserted
  `)
  const row = ((result as any) as any[])[0]
  const inserted = row?.inserted === true || row?.inserted === 't' || row?.inserted === 1
  
  const reactivated = !inserted && row?.status === 'pending'
  return {
    idSubscriber: Number(row.id_subscriber),
    status: row.status as SubscriberStatus,
    created: inserted,
    reactivated,
    unsubscribeToken: String(row.unsubscribe_token),
  }
}

export interface ListSubscribersOpts {
  clientId: string
  status?: SubscriberStatus | 'all'
  q?: string
  limit?: number
  offset?: number
}

export interface ListSubscribersResult {
  rows: NewsletterSubscriberRow[]
  total: number
  byStatus: Record<SubscriberStatus, number>
}

export async function listSubscribers(opts: ListSubscribersOpts): Promise<ListSubscribersResult> {
  const limit = Math.min(Math.max(Number(opts.limit ?? 50), 1), 500)
  const offset = Math.max(Number(opts.offset ?? 0), 0)
  const status = opts.status && opts.status !== 'all' ? opts.status : null
  const q = opts.q ? `%${opts.q.toLowerCase()}%` : null

  const rowsResult = await usePocPg().execute<any>(sql`
    SELECT id_subscriber, client_id, email, status, locale, source, source_url,
           ip, user_agent, consent_at, confirmed_at, unsubscribe_token,
           unsubscribed_at, bounce_reason, date_add, date_upd
      FROM cs_main.cs_newsletter_subscriber
     WHERE client_id = ${opts.clientId}
       AND (${status}::text IS NULL OR status = ${status})
       AND (${q}::text IS NULL OR lower(email) LIKE ${q})
     ORDER BY date_add DESC
     LIMIT ${limit} OFFSET ${offset}
  `)

  const totalResult = await usePocPg().execute<any>(sql`
    SELECT COUNT(*)::int AS total
      FROM cs_main.cs_newsletter_subscriber
     WHERE client_id = ${opts.clientId}
       AND (${status}::text IS NULL OR status = ${status})
       AND (${q}::text IS NULL OR lower(email) LIKE ${q})
  `)

  const byStatusResult = await usePocPg().execute<any>(sql`
    SELECT status, COUNT(*)::int AS n
      FROM cs_main.cs_newsletter_subscriber
     WHERE client_id = ${opts.clientId}
     GROUP BY status
  `)

  const byStatus: Record<SubscriberStatus, number> = {
    pending: 0, confirmed: 0, unsubscribed: 0, bounced: 0,
  }
  for (const r of (byStatusResult as any) as any[]) {
    const s = r.status as SubscriberStatus
    if (s in byStatus) byStatus[s] = Number(r.n)
  }

  return {
    rows: ((rowsResult as any) as any[]) as NewsletterSubscriberRow[],
    total: Number(((totalResult as any) as any[])[0]?.total ?? 0),
    byStatus,
  }
}

export async function unsubscribeById(clientId: string, idSubscriber: number, reason?: string): Promise<boolean> {
  const result = await usePocPg().execute<any>(sql`
    UPDATE cs_main.cs_newsletter_subscriber
       SET status          = 'unsubscribed',
           unsubscribed_at = NOW(),
           bounce_reason   = ${reason ?? null},
           date_upd        = NOW()
     WHERE client_id = ${clientId}
       AND id_subscriber = ${idSubscriber}
       AND status <> 'unsubscribed'
    RETURNING id_subscriber
  `)
  return ((result as any) as any[]).length > 0
}

export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; email?: string; clientId?: string }> {
  const result = await usePocPg().execute<any>(sql`
    UPDATE cs_main.cs_newsletter_subscriber
       SET status          = 'unsubscribed',
           unsubscribed_at = NOW(),
           date_upd        = NOW()
     WHERE unsubscribe_token = ${token}
       AND status <> 'unsubscribed'
    RETURNING email, client_id
  `)
  const row = ((result as any) as any[])[0]
  if (!row) return { ok: false }
  return { ok: true, email: String(row.email), clientId: String(row.client_id) }
}
