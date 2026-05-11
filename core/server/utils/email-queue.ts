

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
  
  scheduledAt?: Date | null
  
  maxAttempts?: number
  

  priority?:    number
  

  attachmentMeta?: AttachmentMeta
}

export type AttachmentMeta =
  | { type: 'quote_pdf'; quoteId: number }
  | { type: 'order_invoice_pdf'; orderId: number }
  

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

export async function enqueueEmail(opts: EnqueueEmailOpts): Promise<number> {
  const sql = getPgClient()

  
  let priority = opts.priority ?? -1
  if (priority < 0 && opts.templateSlug) {
    try {
      const tplRows = await sql<{ priority: number }[]>`
        SELECT priority FROM ${sql(PG_SCHEMA)}.cs_email_template
         WHERE slug = ${opts.templateSlug} LIMIT 1
      `
      if (tplRows[0]) priority = Number(tplRows[0].priority)
    } catch {  }
  }
  if (priority < 0) priority = 50
  
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
