

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { cachedFetch, invalidateCache } from './redis'

export interface LoadedEmailTemplate {
  subject:    string
  htmlBody:   string
  plainBody:  string | null
  audience:   'client' | 'admin' | string
  
  recipientTo:  string
  recipientCc:  string
  recipientBcc: string
}

const TTL_SEC = 5 * 60

export async function loadEmailTemplate(
  slug: string,
  idLang: number = 1,
): Promise<LoadedEmailTemplate | null> {
  
  
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

export async function clearEmailTemplateCache(slug?: string): Promise<void> {
  if (!slug) return   
  for (const idLang of [1, 2, 3]) {
    await invalidateCache(`email-tpl:${slug}:${idLang}`)
  }
}
