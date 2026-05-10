/**
 *
 * cs_email_queue facade: enqueue + drain.
 *
 * Anti-spam-ban: the queue drains 1 email per cron run (60s) with
 * FOR UPDATE SKIP LOCKED to stay under the MTA reputation threshold.
 *
 * Pattern aligned with covergen-queue.ts (atomic claim status='sending',
 * RETURNING, send via sendEmail, UPDATE status='sent'|'failed').
 */

import { getPgClient } from './db-pg-adapter'
import { sendEmail } from './email'

const PG_SCHEMA = 'cs_main'

export interface EnqueueEmailOpts {
  to:           string
  subject:      string
  htmlBody:     string
  plainBody?:   string | null
  fromEmail?:   string | null
  replyTo?:     string | null
  templateSlug?: string | null
  idLang?:      number | null
  /** Date future (ISO) pour différer l'envoi. Omis = ASAP. */
  scheduledAt?: Date | null
  /** Plafond de tentatives (default 3). */
  maxAttempts?: number
  /** Priority 0-100 (0=critical, 50=standard, 100=marketing). If omitted and
   * provided templateSlug: inherits from cs_email_template.priority. Otherwise 50. */
  priority?:    number
  /** Deferred attachment: `{ type, …args }`. The worker dispatches on the
   * corresponding generator (cf ATTACHMENT_GENERATORS) at send time.
   * Ex: `{ type: 'quote_pdf', quoteId: 10 }`. Avoids synchronous generation
   * on the HTTP caller side. */
  attachmentMeta?: AttachmentMeta
}

/**
 * Deferred attachment types. Extend here when adding a new
 * generator (invoice, contract, etc.). The worker dispatches on the `type`.
 */
export type AttachmentMeta =
  | { type: 'quote_pdf'; quoteId: number }
  | { type: 'order_invoice_pdf'; orderId: number }
  // Futurs : { type: 'invoice_pdf'; invoiceId: number } etc.

export interface ProcessQueueResult {
  scanned:   number
  processed: number
  errors:    number
  items: Array<{
    id:        number
    to:        string
    status:    'sent' | 'failed' | 'requeued'
    error?:    string
    resendId?: string
  }>
}

/**
 * Queues an email. Returns the created id_ac_email_queue.
 *
 * The payload (subject + html_body) must already be rendered — the queue does not
 * substitute variables. The caller does its interpolation via
 * email-template-render.ts then queues the final HTML.
 */
export async function enqueueEmail(opts: EnqueueEmailOpts): Promise<number> {
  const sql = getPgClient()

  // Résolution priority : explicite > héritée du template > default 50.
  let priority = opts.priority ?? -1
  if (priority < 0 && opts.templateSlug) {
    try {
      const tplRows = await sql<{ priority: number }[]>`
        SELECT priority FROM ${sql(PG_SCHEMA)}.cs_email_template
         WHERE slug = ${opts.templateSlug} LIMIT 1
      `
      if (tplRows[0]) priority = Number(tplRows[0].priority)
    } catch { /* fallback default */ }
  }
  if (priority < 0) priority = 50
  // Defensive 0..100 clamp (a caller must not be able to bypass everything).
  priority = Math.max(0, Math.min(100, priority))

  const attachmentMetaJson = opts.attachmentMeta ? JSON.stringify(opts.attachmentMeta) : ''

  const rows = await sql<{ id_ac_email_queue: number }[]>`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_email_queue (
      to_email, subject, html_body, plain_body,
      from_email, reply_to, template_slug, id_lang,
      status, priority, attachment_meta, max_attempts, scheduled_at, date_add, date_upd
    ) VALUES (
      ${opts.to},
      ${opts.subject.slice(0, 500)},
      ${opts.htmlBody},
      ${opts.plainBody ?? null},
      ${opts.fromEmail ?? null},
      ${opts.replyTo ?? null},
      ${opts.templateSlug ?? null},
      ${opts.idLang ?? null},
      'pending',
      ${priority},
      ${attachmentMetaJson},
      ${Math.max(1, Math.min(10, opts.maxAttempts ?? 3))},
      ${opts.scheduledAt ?? null},
      NOW(),
      NOW()
    )
    RETURNING id_ac_email_queue
  `
  return rows[0]!.id_ac_email_queue
}

/**
 * Mapping type → generator. The worker calls the generator with the args
 * from meta to get a Buffer attachment. Failure → log + continue
 * without attachment (no send blocking).
 */
const ATTACHMENT_GENERATORS: Record<
  string,
  (meta: any) => Promise<{ filename: string; content: Buffer } | null>
> = {
  async quote_pdf(meta: { quoteId: number }) {
    const { generateQuoteRequestPdf } = await import('./quote-pdf')
    const buf = await generateQuoteRequestPdf(meta.quoteId)
    if (!buf) return null
    return { filename: `devis-Q-${meta.quoteId}.pdf`, content: buf }
  },
  async order_invoice_pdf(meta: { orderId: number }) {
    const { getOrderFromDb } = await import('./orders-db')
    const { generateInvoicePdf } = await import('./invoice-pdf')
    const order = await getOrderFromDb(meta.orderId)
    if (!order) return null
    // Shop name : best-effort depuis ps_configuration. Au pire 'Boutique'.
    const { usePocPg } = await import('../db/drizzle-pg')
    const { sql } = await import('drizzle-orm')
    const rows: any[] = await usePocPg().execute(
      sql`SELECT value FROM cs_main.ps_configuration WHERE name='PS_SHOP_NAME' LIMIT 1`
    ).catch(() => [] as any[]) as any[]
    const shopName = rows?.[0]?.value || 'Boutique'
    const buf = await generateInvoicePdf(order, shopName)
    if (!buf) return null
    return { filename: `commande-${order.reference}.pdf`, content: buf }
  },
}

async function resolveAttachment(metaJson: string | null): Promise<{ filename: string; content: Buffer } | null> {
  if (!metaJson) return null
  try {
    const meta = JSON.parse(metaJson) as { type: string }
    const gen = ATTACHMENT_GENERATORS[meta.type]
    if (!gen) {
      console.warn(`[email-queue] attachment type inconnu: ${meta.type}`)
      return null
    }
    return await gen(meta)
  } catch (err: any) {
    console.error('[email-queue] resolveAttachment KO:', err?.message)
    return null
  }
}

type ClaimedRow = {
  id_ac_email_queue: number
  to_email:    string
  subject:     string
  html_body:   string
  plain_body:  string | null
  from_email:  string | null
  reply_to:    string | null
  attempts:    number
  max_attempts: number
  attachment_meta: string | null
}

/**
 * Drains the queue: claim N pending rows due, send via Resend, UPDATE
 * status. `limit=1` by default (anti-spam-ban via cron 60s).
 *
 * On failure: if attempts < max_attempts → reverts to 'pending' (retry on
 * next run with backoff scheduled_at +1min × attempts); otherwise 'failed'.
 */
export async function processEmailQueue(opts: {
  limit?: number
} = {}): Promise<ProcessQueueResult> {
  const limit = Math.max(1, Math.min(20, opts.limit ?? 1))
  const sql = getPgClient()

  const claimed = await sql<ClaimedRow[]>`
    UPDATE ${sql(PG_SCHEMA)}.cs_email_queue
    SET status = 'sending', date_upd = NOW()
    WHERE id_ac_email_queue IN (
      SELECT id_ac_email_queue
      FROM ${sql(PG_SCHEMA)}.cs_email_queue
      WHERE status = 'pending'
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
      -- Priority ASC : 0=critique passe avant 50=standard avant 100=marketing.
      -- Tie-break par date_add ASC (FIFO dans un même niveau).
      ORDER BY priority ASC, date_add ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id_ac_email_queue, to_email, subject, html_body, plain_body,
              from_email, reply_to, attempts, max_attempts, attachment_meta
  `

  const result: ProcessQueueResult = {
    scanned: claimed.length,
    processed: 0,
    errors: 0,
    items: [],
  }

  for (const row of claimed) {
    // Attachment différé : résolution au moment du send (= au worker, pas
    // au caller HTTP). Génération PDF/etc. sortie du chemin critique.
    const attachment = await resolveAttachment(row.attachment_meta)
    const send = await sendEmail({
      to:      row.to_email,
      subject: row.subject,
      html:    row.html_body,
      from:    row.from_email ?? undefined,
      replyTo: row.reply_to ?? undefined,
      ...(attachment ? { attachments: [{ filename: attachment.filename, content: attachment.content, contentType: 'application/pdf' }] } : {}),
    })

    const newAttempts = row.attempts + 1

    if (send.ok) {
      await sql`
        UPDATE ${sql(PG_SCHEMA)}.cs_email_queue
        SET status = 'sent',
            attempts = ${newAttempts},
            resend_id = ${send.id ?? null},
            sent_at = NOW(),
            last_error = NULL,
            date_upd = NOW()
        WHERE id_ac_email_queue = ${row.id_ac_email_queue}
      `
      result.processed++
      result.items.push({
        id: row.id_ac_email_queue,
        to: row.to_email,
        status: 'sent',
        resendId: send.id,
      })
    } else {
      const exhausted = newAttempts >= row.max_attempts
      const nextStatus = exhausted ? 'failed' : 'pending'
      // Backoff linéaire : +1min × tentative (1, 2, 3 min)
      const backoffMs = exhausted ? 0 : newAttempts * 60_000
      const nextScheduled = exhausted ? null : new Date(Date.now() + backoffMs)
      await sql`
        UPDATE ${sql(PG_SCHEMA)}.cs_email_queue
        SET status = ${nextStatus},
            attempts = ${newAttempts},
            last_error = ${send.error ?? 'unknown'},
            scheduled_at = ${nextScheduled},
            date_upd = NOW()
        WHERE id_ac_email_queue = ${row.id_ac_email_queue}
      `
      result.errors++
      result.items.push({
        id: row.id_ac_email_queue,
        to: row.to_email,
        status: exhausted ? 'failed' : 'requeued',
        error: send.error,
      })
    }
  }

  return result
}

/**
 * Drop-in replacement for sendEmail() for transactional callers:
 * enqueues then returns the same shape as sendEmail() (ok/id/error).
 *
 * Used by order-emails (sendOrderConfirmationEmail, sendWelcomeEmail),
 * test-send, broadcast, contact, wishlist, onboarding, generate-contract,
 * sav-reply. All benefit from the anti-spam-ban throttle via the cron
 * email:queue-process (1 email/min).
 *
 * The returned `id` is prefixed with `queued-` to distinguish from native Resend ids.
 * An actual sending error will be visible in the /hub/crm/email tab Queue
 * (status='failed', last_error filled) — not propagated to the HTTP caller.
 */
export async function sendEmailViaQueue(opts: {
  to:        string
  subject:   string
  html:      string
  from?:     string
  replyTo?:  string
  templateSlug?: string
  idLang?:   number
  priority?: number
  attachmentMeta?: AttachmentMeta
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const queueId = await enqueueEmail({
      to:           opts.to,
      subject:      opts.subject,
      htmlBody:     opts.html,
      fromEmail:    opts.from ?? null,
      replyTo:      opts.replyTo ?? null,
      templateSlug: opts.templateSlug ?? null,
      idLang:       opts.idLang ?? null,
      priority:     opts.priority,
      attachmentMeta: opts.attachmentMeta,
    })
    return { ok: true, id: `queued-${queueId}` }
  } catch (err: any) {
    const errorMsg = err?.message || 'Erreur queue email'
    console.error('[email-queue] enqueue failed:', errorMsg)
    return { ok: false, error: errorMsg }
  }
}

/**
 * Cancels a pending email (status='pending' only). Returns true
 * if the row was switched to 'cancelled', false otherwise (already sent /
 * in progress / cancelled).
 */
export async function cancelQueuedEmail(id: number): Promise<boolean> {
  const sql = getPgClient()
  const updated = await sql<{ id_ac_email_queue: number }[]>`
    UPDATE ${sql(PG_SCHEMA)}.cs_email_queue
    SET status = 'cancelled', date_upd = NOW()
    WHERE id_ac_email_queue = ${id} AND status = 'pending'
    RETURNING id_ac_email_queue
  `
  return updated.length > 0
}

/**
 * Resets a 'failed' or 'cancelled' to 'pending' (ASAP). Useful
 * when the admin has corrected the error (wrong address, etc.) and wants
 * relancer.
 */
export async function retryQueuedEmail(id: number): Promise<boolean> {
  const sql = getPgClient()
  const updated = await sql<{ id_ac_email_queue: number }[]>`
    UPDATE ${sql(PG_SCHEMA)}.cs_email_queue
    SET status = 'pending',
        attempts = 0,
        last_error = NULL,
        scheduled_at = NULL,
        date_upd = NOW()
    WHERE id_ac_email_queue = ${id} AND status IN ('failed', 'cancelled')
    RETURNING id_ac_email_queue
  `
  return updated.length > 0
}
