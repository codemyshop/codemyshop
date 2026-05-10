/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { requireCustomer } from '~/server/utils/customer-session'
import { sendEmailViaQueue } from '~/server/utils/email-queue'
import {
  assertOwnership,
  fetchListOwner,
  itemsForList,
  MAX_MESSAGE_LENGTH,
  type WishlistItem,
} from '~/server/utils/wishlist-db'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderItemsHtml(items: WishlistItem[], shopUrl: string): string {
  const rows = items.map((item) => {
    const link = `${shopUrl}/produit/${item.idProduct}`
    const img = item.idImage
      ? `${shopUrl}/${item.idImage}-home_default/${encodeURIComponent(item.linkRewrite)}.jpg`
      : ''
    return [
      '<tr>',
      `<td style="width:80px;padding:8px;">`,
      img ? `<img src="${escapeHtml(img)}" width="64" style="display:block;border-radius:4px;">` : '',
      '</td>',
      `<td style="padding:8px;font-family:Arial,sans-serif;font-size:14px;color:#1f2937;">`,
      `<a href="${escapeHtml(link)}" style="color:#1f2937;text-decoration:none;font-weight:600;">`,
      escapeHtml(item.productName),
      '</a>',
      `<div style="color:#6b7280;font-size:12px;margin-top:4px;">Qté&nbsp;: ${item.quantity}`,
      item.reference ? ` · Réf. ${escapeHtml(item.reference)}` : '',
      '</div>',
      '</td></tr>',
    ].join('')
  }).join('')
  return `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">${rows}</table>`
}

function renderEmailHtml(opts: {
  shopName: string
  shopUrl: string
  ownerFirstname: string
  listName: string
  listUrl: string
  message: string
  itemsHtml: string
}): string {
  const intro = opts.message
    ? `<p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;color:#1f2937;">${escapeHtml(opts.message).replace(/\n/g, '<br>')}</p>`
    : ''
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f9fafb;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;">
  <h1 style="font-family:Arial,sans-serif;font-size:20px;color:#111;margin:0 0 8px 0;">${escapeHtml(opts.listName)}</h1>
  <p style="font-family:Arial,sans-serif;font-size:13px;color:#6b7280;margin:0 0 24px 0;">
    Liste partagée par ${escapeHtml(opts.ownerFirstname)} depuis ${escapeHtml(opts.shopName)}
  </p>
  ${intro}
  ${opts.itemsHtml}
  <p style="margin:24px 0 0 0;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;">
    <a href="${escapeHtml(opts.listUrl)}" style="color:#1f2937;">Voir la liste en ligne →</a>
  </p>
</div>
</body></html>`
}

export default defineEventHandler(async (event) => {
  const session = requireCustomer(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }
  const body = await readBody<{ to?: string; message?: string }>(event).catch(() => ({}))
  const to = String(body?.to || '').trim().toLowerCase()
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw createError({ statusCode: 422, message: 'Email destinataire invalide' })
  }
  const senderMessage = String(body?.message || '').trim().slice(0, MAX_MESSAGE_LENGTH)

  const ctx = { event }
  if (!(await assertOwnership(id, session.customerId, ctx))) {
    throw createError({ statusCode: 403, message: 'Liste introuvable ou non autorisée' })
  }

  const owner = await fetchListOwner(id, ctx)
  if (!owner) {
    throw createError({ statusCode: 404, message: 'Liste introuvable' })
  }

  const items = await itemsForList(id, 1, ctx)
  if (items.length === 0) {
    throw createError({ statusCode: 422, message: 'Liste vide' })
  }

  const proto = (event.node?.req?.headers?.['x-forwarded-proto'] as string) || 'https'
  const host = getRequestHost(event) || ''
  const shopUrl = host ? `${proto}://${host}` : ''
  const listUrl = `${shopUrl}/favoris/${id}`

  const cfg = useRuntimeConfig(event)
  const shopName = String((cfg as any)?.public?.siteName || (cfg as any)?.public?.brandName || host || 'CodeMyShop')

  const html = renderEmailHtml({
    shopName,
    shopUrl,
    ownerFirstname: owner.firstname,
    listName: owner.name,
    listUrl,
    message: senderMessage,
    itemsHtml: renderItemsHtml(items, shopUrl),
  })

  const subject = `[${shopName}] ${owner.name} — ${senderMessage ? 'partage une liste de favoris' : 'votre liste de favoris'}`

  const result = await sendEmailViaQueue({
    to,
    subject,
    html,
    replyTo: owner.email || undefined,
  })

  return {
    success: true,
    mail_sent: !!result.ok,
    mail_id: result.id,
    mail_error: result.error,
    to,
    id_wishlist: id,
    item_count: items.length,
  }
})
