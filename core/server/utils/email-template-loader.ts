/**
 *
 * DB-first loader for email templates (cs_email_template_lang).
 *
 * Single source of truth editable from /hub/crm/email/template/{slug}. The
 * senders de `order-emails.ts` (sendWelcomeEmail, sendOrderConfirmationEmail,
 * etc.) read from here rather than inlining their HTML — any admin panel change takes
 * effet au prochain envoi (cache TTL 5 min).
 *
 * Simple in-process cache: Map keyed by `${slug}:${idLang}`. The cache
 * includes misses (data=null) to avoid re-querying the database in a loop
 * when a slug does not yet exist.
 *
 * Adding/modifying a template → invalidate via clearEmailTemplateCache(slug)
 * (on the PUT /api/bo/email-templates/{slug} endpoint, to be wired up).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { cachedFetch, invalidateCache } from './redis'

export interface LoadedEmailTemplate {
  subject:    string
  htmlBody:   string
  plainBody:  string | null
  audience:   'client' | 'admin' | string
  /** Destinataires admin uniquement (CSV brut, à parser via parseRecipients). */
  recipientTo:  string
  recipientCc:  string
  recipientBcc: string
}

const TTL_SEC = 5 * 60

export async function loadEmailTemplate(
  slug: string,
  idLang: number = 1,
): Promise<LoadedEmailTemplate | null> {
  // Shared Redis cache (survives redeployments, shared across PM2 instances).
  // Fall back to direct fetch if Redis is unavailable.
  return cachedFetch<LoadedEmailTemplate | null>(
    `email-tpl:${slug}:${idLang}`,
    TTL_SEC,
    async () => {
      try {
        const rows = await usePocPg().execute<any>(sql`
          SELECT l.subject, l.html_body, l.plain_body,
                 t.audience, t.recipient_to, t.recipient_cc, t.recipient_bcc
            FROM cs_main.cs_email_template_lang l
            JOIN cs_main.cs_email_template t ON t.slug = l.slug
           WHERE l.slug = ${slug} AND l.id_lang = ${idLang}
           LIMIT 1
        `) as any[]
        return rows[0]
          ? {
              subject:      String(rows[0].subject || ''),
              htmlBody:     String(rows[0].html_body || ''),
              plainBody:    rows[0].plain_body ?? null,
              audience:     String(rows[0].audience || 'client'),
              recipientTo:  String(rows[0].recipient_to  || ''),
              recipientCc:  String(rows[0].recipient_cc  || ''),
              recipientBcc: String(rows[0].recipient_bcc || ''),
            }
          : null
      } catch (err: any) {
        console.warn(`[email-template-loader] DB error slug=${slug} lang=${idLang}:`, err?.message)
        return null
      }
    },
  )
}

/**
 * Parse a CSV of recipients into a deduplicated and filtered email list.
 * Tolerates spaces around commas, semicolons, newlines.
 * Basic regex validation (RFC-light sufficient to catch typos
 * — not a deliverability check).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseRecipients(csv: string): string[] {
  if (!csv) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of csv.split(/[,;\n]/)) {
    const e = raw.trim().toLowerCase()
    if (!e || !EMAIL_RE.test(e) || seen.has(e)) continue
    seen.add(e)
    out.push(e)
  }
  return out
}

/**
 * Resolves the recipient of an admin template:
 * 1. recipient_to (CSV) if provided
 *  2. fallback env ADMIN_NOTIF_EMAIL → BLOG_CONTACT_EMAIL → CONTACT_EMAIL
 * 3. otherwise returns {} and the caller decides to abort / log
 */
export function resolveAdminRecipients(tpl: LoadedEmailTemplate): {
  to:  string[]
  cc:  string[]
  bcc: string[]
} {
  const to  = parseRecipients(tpl.recipientTo)
  const cc  = parseRecipients(tpl.recipientCc)
  const bcc = parseRecipients(tpl.recipientBcc)
  if (to.length === 0) {
    const envFallback = process.env.ADMIN_NOTIF_EMAIL
                     || process.env.BLOG_CONTACT_EMAIL
                     || process.env.CONTACT_EMAIL
                     || ''
    const fallback = parseRecipients(envFallback)
    if (fallback.length) to.push(...fallback)
  }
  return { to, cc, bcc }
}

/**
 * Invalidates the cache (a specific slug on the Redis side). To be called from
 * the PUT /api/bo/email-templates/{slug} endpoint after UPDATE.
 *
 * NB: invalidates common languages (1=FR, 2=EN, 3=DE) — adapt if we
 * add other languages. No wildcard on the unstorage side so we list them.
 */
export async function clearEmailTemplateCache(slug?: string): Promise<void> {
  if (!slug) return   // pas de wildcard avec unstorage — caller responsable
  for (const idLang of [1, 2, 3]) {
    await invalidateCache(`email-tpl:${slug}:${idLang}`)
  }
}
