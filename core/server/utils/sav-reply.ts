/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Customer support reply helpers — Drizzle direct on ps_customer_thread + ps_customer_message.
 * Phase 9b.4e chantier headless-modules-ts (option C-hard). Remplace
 * `psProxy ac_savapi/reply` on the Nuxt side:
 *   1. Lookup thread + customer
 *   2. INSERT ps_customer_message
 *   3. UPDATE ps_customer_thread.status
 *   4. sendEmail() via Resend (config tenant : shop_email/shop_name lus
 *      depuis ps_configuration)
 *
 * The ac_savapi module remains active — used by other consumers
 * (ps_customer_message in native back office, etc.) — but the Nuxt → DB path
 * direct becomes authoritative for /api/bo/sav/:id/reply.
 *
 * Project #44 (2026-04-30): migrated MariaDB → PostgreSQL (cs_main).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { sendEmailViaQueue } from './email-queue'

export const SAV_ALLOWED_STATUSES = ['open', 'closed', 'pending1', 'pending2'] as const
export type SavStatus = typeof SAV_ALLOWED_STATUSES[number]

const MAX_MESSAGE_LENGTH = 20000

function sanitizeMessage(raw: string): string {
  return raw.trim().replace(/\r\n|\r/g, '\n').slice(0, MAX_MESSAGE_LENGTH)
}

export interface SavReplyInput {
  idThread: number
  message: string
  status?: SavStatus
}

export interface SavReplyResult {
  success: boolean
  idMessage?: number
  idThread: number
  status: SavStatus
  mailSent: boolean
  to?: string
  error?: string
  statusCode?: number
}

interface ThreadContext {
  idCustomerThread: number
  idCustomer: number | null
  idLang: number
  idShop: number
  email: string
  status: string
  firstname: string
  lastname: string
}

async function getThreadContext(d: any, idThread: number): Promise<ThreadContext | null> {
  if (idThread <= 0) return null
  const r = await d.execute(sql`
    SELECT
      ct.id_customer_thread,
      ct.id_customer,
      ct.id_lang,
      ct.id_shop,
      ct.email,
      ct.status,
      c.firstname,
      c.lastname
    FROM cs_main.ps_customer_thread ct
    LEFT JOIN cs_main.ps_customer c ON c.id_customer = ct.id_customer
    WHERE ct.id_customer_thread = ${idThread}
    LIMIT 1
  `) as any[]
  if (!r.length) return null
  const row = r[0]
  return {
    idCustomerThread: Number(row.id_customer_thread),
    idCustomer: row.id_customer ? Number(row.id_customer) : null,
    idLang: Number(row.id_lang || 1),
    idShop: Number(row.id_shop || 1),
    email: String(row.email || ''),
    status: String(row.status || ''),
    firstname: String(row.firstname || ''),
    lastname: String(row.lastname || ''),
  }
}

async function getShopIdentity(d: any, idShop: number): Promise<{ shopName: string; shopEmail: string; shopUrl: string }> {
  // ps_configuration peut avoir des values shop-scoped — on cherche
  // d'abord la value shop=idShop puis fallback global.
  const fetch = async (key: string): Promise<string> => {
    const r1 = await d.execute(sql`
      SELECT value FROM cs_main.ps_configuration
       WHERE name = ${key} AND id_shop = ${idShop} LIMIT 1
    `) as Array<{ value: string }>
    if (r1[0]?.value) return r1[0].value
    const r2 = await d.execute(sql`
      SELECT value FROM cs_main.ps_configuration WHERE name = ${key} LIMIT 1
    `) as Array<{ value: string }>
    return r2[0]?.value || ''
  }
  const [shopName, shopEmail] = await Promise.all([
    fetch('PS_SHOP_NAME'),
    fetch('PS_SHOP_EMAIL'),
  ])
  // ps_shop_url donne le domaine
  const urlRow = await d.execute(sql`
    SELECT domain, physical_uri FROM cs_main.ps_shop_url WHERE id_shop = ${idShop} AND main = 1 LIMIT 1
  `) as Array<{ domain: string; physical_uri: string }>
  const domain = urlRow[0]?.domain || ''
  const phys = urlRow[0]?.physical_uri || '/'
  const shopUrl = domain ? `https://${domain}${phys}` : ''
  return { shopName, shopEmail, shopUrl }
}

function renderReplyHtml(vars: { firstname: string; lastname: string; reply: string; link: string; shopName: string; shopUrl: string }): string {
  const safeReply = vars.reply.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  const fullName = [vars.firstname, vars.lastname].filter(Boolean).join(' ').trim() || 'Bonjour'
  return `
<div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding: 24px;">
  <p style="font-size: 14px;">Bonjour ${fullName},</p>
  <p style="font-size: 14px;">Voici la réponse à votre demande SAV :</p>
  <div style="border-left: 3px solid #7C3AED; padding: 12px 16px; background: #f8f9fa; margin: 16px 0; font-size: 14px;">${safeReply}</div>
  ${vars.link ? `<p style="font-size: 13px;">Vous pouvez consulter votre dossier sur <a href="${vars.link}" style="color: #7C3AED;">${vars.shopName}</a>.</p>` : ''}
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
  <p style="font-size: 12px; color: #64748b;">${vars.shopName}${vars.shopUrl ? ` — <a href="${vars.shopUrl}" style="color: #64748b;">${vars.shopUrl}</a>` : ''}</p>
</div>`.trim()
}

export async function savReply(input: SavReplyInput, event?: any): Promise<SavReplyResult> {
  const idThread = Number(input.idThread)
  if (!Number.isFinite(idThread) || idThread <= 0) {
    return { success: false, idThread: 0, status: 'closed', mailSent: false, error: 'id_thread requis', statusCode: 422 }
  }

  const messageClean = sanitizeMessage(input.message || '')
  if (!messageClean) {
    return { success: false, idThread, status: 'closed', mailSent: false, error: 'message requis', statusCode: 422 }
  }

  const status: SavStatus = (SAV_ALLOWED_STATUSES as readonly string[]).includes(input.status as string)
    ? (input.status as SavStatus)
    : 'closed'

  const d = usePocPg()
  const ctx = await getThreadContext(d, idThread)
  if (!ctx) {
    return { success: false, idThread, status, mailSent: false, error: 'Ticket introuvable', statusCode: 404 }
  }

  // 1. INSERT message (id_employee = 1, super admin tenant par défaut)
  //    PG : RETURNING au lieu de LAST_INSERT_ID, NOW() au lieu de string format,
  //    "read" en guillemets (mot non-réservé en PG mais on garde la quote pour
  //    éviter toute ambiguïté de quoting cross-DB).
  const inserted = await d.execute(sql`
    INSERT INTO cs_main.ps_customer_message
      (id_customer_thread, id_employee, message, private, "read", date_add, date_upd)
    VALUES
      (${idThread}, 1, ${messageClean}, 0, 1, NOW(), NOW())
    RETURNING id_customer_message
  `) as Array<{ id_customer_message: number | string }>
  const idMessage = Number(inserted[0]?.id_customer_message || 0)
  if (idMessage <= 0) {
    return { success: false, idThread, status, mailSent: false, error: 'INSERT ps_customer_message KO', statusCode: 500 }
  }

  // 2. UPDATE thread
  await d.execute(sql`
    UPDATE cs_main.ps_customer_thread SET status = ${status}, date_upd = NOW()
     WHERE id_customer_thread = ${idThread}
  `)

  // 3. Mail via Resend (config tenant lue en DB)
  const { shopName, shopEmail, shopUrl } = await getShopIdentity(d, ctx.idShop)
  const link = shopUrl ? `${shopUrl.replace(/\/+$/, '')}/contact` : ''

  const html = renderReplyHtml({
    firstname: ctx.firstname,
    lastname: ctx.lastname,
    reply: messageClean,
    link,
    shopName: shopName || 'Service client',
    shopUrl,
  })

  const subject = shopName ? `[${shopName}] Réponse à votre demande SAV` : 'Réponse à votre demande SAV'
  const fromName = shopName || 'Service client'
  // From doit être un domaine vérifié sur Resend. On préfère le shopEmail
  // tenant ; si non vérifié sur Resend, ça plantera et l'erreur sera visible.
  // Sinon fallback noreply@ + domaine inféré + replyTo shopEmail.
  const from = shopEmail
    ? `${fromName} <${shopEmail}>`
    : (process.env.RESEND_DEFAULT_FROM || 'Service client <noreply@codemyshop.com>')

  const sent = await sendEmailViaQueue({
    to: ctx.email,
    subject,
    html,
    from,
    replyTo: shopEmail || undefined,
  })

  return {
    success: true,
    idMessage,
    idThread,
    status,
    mailSent: sent.ok,
    to: ctx.email,
  }
}
