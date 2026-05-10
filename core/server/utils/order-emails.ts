/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { sendEmailViaQueue } from './email-queue'
import { loadEmailTemplate, resolveAdminRecipients, type LoadedEmailTemplate } from './email-template-loader'
import { renderEmailTemplate } from './email-template-render'
import type { OrderData } from '~/server/connectors/base'

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

/**
 * Builds the HTML product block for the `{products}` placeholder of the
 * template `order_confirmation`. Wraps the rows in a styled table.
 */
/** Mention promo en dessous du nom produit dans les emails — barré + badge.
 * Present only if a `ps_specific_price` was active at creation
 *  de commande (cf. orders-db.getOrderFromDb → priceHTBeforeDiscount). */
function promoLineHtml(item: OrderData['items'][number]): string {
  if (!item.priceHTBeforeDiscount && !item.reductionLabel) return ''
  const barred = item.priceHTBeforeDiscount
    ? `<span style="text-decoration:line-through;color:#dc2626;">${formatPrice(item.priceHTBeforeDiscount)} HT</span>`
    : ''
  const badge = item.reductionLabel
    ? `<span style="display:inline-block;background:#dc2626;color:white;font-weight:700;font-size:10px;padding:1px 6px;border-radius:9999px;margin-left:6px;">${item.reductionLabel}</span>`
    : ''
  return `<div style="margin-top:2px;font-size:11px;">${barred}${badge}</div>`
}

function buildOrderProductsHtml(items: OrderData['items']): string {
  const rows = items.map((item) => {
    const ppu = item.pricePerUnitFormatted
    const ulabel = item.unitLabel || 'HT/K'
    const unitCell = ppu
      ? `${ppu}&nbsp;<span style="color:#64748b;font-weight:600;">${ulabel}</span>`
      : '—'
    return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">
        ${item.name.replace(/[<>]/g, '')}
        ${promoLineHtml(item)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;color:#475569;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;white-space:nowrap;">${unitCell}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;">${formatPrice(item.priceTTC * item.quantity)}</td>
    </tr>
  `}).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
<thead>
<tr style="background:#f8fafc;">
<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Produit</th>
<th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Qté</th>
<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Prix unitaire</th>
<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Total TTC</th>
</tr>
</thead>
<tbody>${rows}</tbody>
</table>`
}

/**
 * Envoie l'email de confirmation de commande.
 *
 * `bankDetails`: IBAN from ps_configuration.BANK_WIRE_*. If provided and
 * the payment is bank transfer, it is displayed in the email so that the
 * customer can pay immediately (otherwise they would need to wait for a
 * manual email from the merchant — unnecessary friction).
 */
export async function sendOrderConfirmationEmail(
  order: OrderData,
  customerEmail: string,
  shopName = 'Boutique',
  accentColor = '#4F46E5',
  bankDetails?: { owner?: string; details?: string; address?: string; customText?: string },
  extras?: { carrierName?: string; historyUrl?: string; attachInvoiceForOrderId?: number },
) {
  // ─── DB-First : le BO /hub/crm/email/template/order_confirmation est la
  // source. Si présent, on rend depuis DB ; sinon fallback inline ci-dessous.
  const tpl = await loadEmailTemplate('order_confirmation', 1)
  if (tpl?.htmlBody) {
    const productsHtml = buildOrderProductsHtml(order.items)
    const isBankwireDb = order.payment.toLowerCase().includes('virement')
    const ribLine = isBankwireDb && bankDetails?.details
      ? `<br><strong>RIB :</strong> ${String(bankDetails.details).split('\n').join(' · ')}`
      : ''
    const subject = renderEmailTemplate(tpl.subject, {
      order_name: `#${order.reference}`,
      shop_name:  shopName,
    })
    const addr = order.addressDelivery
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname:           addr?.firstname || '',
      lastname:            addr?.lastname || '',
      order_name:          `#${order.reference}`,
      date:                new Date(order.dateAdd || Date.now()).toLocaleDateString('fr-FR'),
      products:            productsHtml,
      total_paid:          formatPrice(order.totalPaidTTC),
      total_products:      formatPrice(order.totalProducts),
      total_shipping:      formatPrice(order.totalShipping),
      delivery_block_html: addr
        ? `${addr.firstname || ''} ${addr.lastname || ''}<br>${addr.address1 || ''}<br>${addr.postcode || ''} ${addr.city || ''}`
        : '',
      // {payment} est dans la whitelist HTML brut (cf email-template-render.ts) :
      payment:             order.payment + ribLine,
      // Bloc carrier conditionnel : vide si pas de transporteur sélectionné
      // injection brute via la whitelist du renderer.
      carrier_block_html:  extras?.carrierName
        ? `<br>Transporteur&nbsp;: ${String(extras.carrierName).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] || c))}`
        : '',
      history_url:         extras?.historyUrl || '#',
      shop_name:           shopName,
      primary_color:       accentColor,
    })
    // PDF facture en attachment (déféré au worker pour ne pas bloquer
    // la requête HTTP — génération PDFKit ~200ms).
    const attachmentMeta = extras?.attachInvoiceForOrderId
      ? ({ type: 'order_invoice_pdf' as const, orderId: extras.attachInvoiceForOrderId })
      : undefined
    return sendEmailViaQueue({ to: customerEmail, subject, html, attachmentMeta })
  }

  // ─── Fallback HTML inline (DB indisponible / template absent) ──────
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;">
        ${item.name}
        ${promoLineHtml(item)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:right;">${formatPrice(item.priceTTC * item.quantity)}</td>
    </tr>
  `).join('')

  const isBankwire = order.payment.toLowerCase().includes('virement')
  const hasBankRib = !!(bankDetails?.details || bankDetails?.owner)
  const ribBlock = isBankwire && hasBankRib ? `
    <table style="width:100%;background:white;border:1px solid #bfdbfe;border-radius:6px;margin:12px 0;font-family:'SFMono-Regular',Consolas,monospace;font-size:13px;">
      ${bankDetails!.owner ? `<tr><td style="padding:8px 12px;color:#1e3a8a;width:120px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">Bénéficiaire</td><td style="padding:8px 12px;color:#1e3a8a;font-weight:600;">${bankDetails!.owner}</td></tr>` : ''}
      ${bankDetails!.details ? `<tr><td style="padding:8px 12px;color:#1e3a8a;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">Coordonnées</td><td style="padding:8px 12px;color:#1e3a8a;white-space:pre-line;">${bankDetails!.details}</td></tr>` : ''}
      ${bankDetails!.address ? `<tr><td style="padding:8px 12px;color:#1e3a8a;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">Adresse banque</td><td style="padding:8px 12px;color:#1e3a8a;white-space:pre-line;">${bankDetails!.address}</td></tr>` : ''}
      <tr><td style="padding:8px 12px;color:#1e3a8a;font-size:11px;text-transform:uppercase;letter-spacing:.04em;border-top:1px solid #e2e8f0;">Référence</td><td style="padding:8px 12px;color:#1e3a8a;font-weight:700;border-top:1px solid #e2e8f0;">#${order.reference}</td></tr>
      <tr><td style="padding:8px 12px;color:#1e3a8a;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">Montant</td><td style="padding:8px 12px;color:#1e3a8a;font-weight:700;">${formatPrice(order.totalPaidTTC)}</td></tr>
    </table>
  ` : ''

  const bankwireNote = isBankwire ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="font-weight:600;color:#1e40af;margin:0 0 8px;">Paiement par virement bancaire</p>
      <p style="font-size:14px;color:#1e40af;margin:0 0 4px;">
        ${hasBankRib
          ? `Effectuez votre virement avec les coordonnées ci-dessous, en indiquant la référence <strong>#${order.reference}</strong> en libellé.`
          : `Veuillez effectuer votre virement en indiquant la référence <strong>#${order.reference}</strong>.`}
      </p>
      ${ribBlock}
      <p style="font-size:13px;color:#1e40af;margin:8px 0 0;">Votre commande sera expédiée dès réception du paiement.</p>
    </div>
  ` : ''

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

    <div style="background:${accentColor};padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;">Commande confirmée</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">${shopName}</p>
    </div>

    <div style="padding:32px;">
      <p style="font-size:16px;color:#1e293b;">
        Votre commande <strong>#${order.reference}</strong> a été enregistrée avec succès.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Produit</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Qté</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Total TTC</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="border-top:2px solid #e2e8f0;padding-top:16px;margin-top:8px;">
        <table style="width:100%;">
          <tr>
            <td style="font-size:14px;color:#64748b;padding:4px 0;">Sous-total HT</td>
            <td style="font-size:14px;text-align:right;">${formatPrice(order.totalProducts)}</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#64748b;padding:4px 0;">Livraison</td>
            <td style="font-size:14px;text-align:right;">${formatPrice(order.totalShipping)}</td>
          </tr>
          <tr>
            <td style="font-size:16px;font-weight:700;padding:8px 0 0;">Total TTC</td>
            <td style="font-size:16px;font-weight:700;text-align:right;color:${accentColor};padding:8px 0 0;">${formatPrice(order.totalPaidTTC)}</td>
          </tr>
        </table>
      </div>

      ${bankwireNote}

      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f1f5f9;">
        <table style="width:100%;font-size:13px;color:#64748b;">
          <tr><td style="padding:2px 0;">Référence</td><td style="text-align:right;">#${order.reference}</td></tr>
          <tr><td style="padding:2px 0;">Paiement</td><td style="text-align:right;">${order.payment}</td></tr>
          <tr><td style="padding:2px 0;">Statut</td><td style="text-align:right;">${order.status}</td></tr>
        </table>
      </div>
    </div>

    <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;">
      ${shopName} — Cet email a été envoyé automatiquement suite à votre commande.
    </div>
  </div>
</body>
</html>`

  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Commande #${order.reference} confirmée — ${shopName}`,
    html,
  })
}

/**
 * Sends the welcome email after account creation.
 */
export async function sendWelcomeEmail(
  customerEmail: string,
  firstname: string,
  company: string,
  shopName = 'Boutique',
  shopUrl = '/',
  accentColor = '#4F46E5',
) {
  // ─── DB-First : éditable depuis /hub/crm/email/template/account_confirmation
  const tpl = await loadEmailTemplate('account_confirmation', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, { shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      company,
      email:         customerEmail,
      shop_name:     shopName,
      shop_url:      shopUrl,
      primary_color: accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html })
  }

  // ─── Fallback HTML inline (DB indisponible / template absent) ──────
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

    <div style="background:${accentColor};padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;">Bienvenue chez ${shopName}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">Votre compte professionnel est créé</p>
    </div>

    <div style="padding:32px;">
      <p style="font-size:16px;color:#1e293b;">
        Bonjour <strong>${firstname}</strong>,
      </p>
      <p style="font-size:14px;color:#475569;line-height:1.6;">
        Votre compte professionnel pour <strong>${company}</strong> a été créé avec succès.
        Vous pouvez dès maintenant parcourir notre catalogue, consulter les prix professionnels et passer commande.
      </p>

      <div style="margin:24px 0;">
        <a href="${shopUrl}" style="display:inline-block;background:${accentColor};color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          Accéder à votre espace
        </a>
      </div>

      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:20px;">
        <p style="font-size:13px;color:#64748b;margin:0 0 8px;font-weight:600;">Votre compte vous permet de :</p>
        <ul style="font-size:13px;color:#64748b;margin:0;padding-left:20px;line-height:1.8;">
          <li>Consulter les tarifs professionnels HT</li>
          <li>Passer commande en ligne</li>
          <li>Suivre vos commandes et télécharger vos factures</li>
          <li>Bénéficier de la livraison gratuite dès 990 € HT</li>
        </ul>
      </div>

      <p style="font-size:13px;color:#94a3b8;margin-top:20px;">
        Email de connexion : <strong>${customerEmail}</strong>
      </p>
    </div>

    <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;">
      ${shopName} — Cet email a été envoyé automatiquement suite à la création de votre compte.
    </div>
  </div>
</body>
</html>`

  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Bienvenue chez ${shopName} — Votre compte professionnel est prêt`,
    html,
  })
}

/**
 * Internal helper: sends a template `audience='admin'` to all
 * recipients `recipient_to` of the template (fallback env if empty). Render via
 * `renderEmailTemplate` with the provided `vars`.
 *
 * Current limitations: the queue does not yet support Cc/Bcc — we enqueue
 * 1 email per address in the To list. If recipient_cc/bcc are filled, we
 * log a warning (not implemented). Future enhancement = add cc/bcc columns
 * in cs_email_queue.
 */
async function sendAdminTemplate(
  slug: string,
  fallbackSubject: string,
  fallbackHtml:    string,
  vars:            Record<string, string | number | undefined | null>,
): Promise<{ ok: boolean; sentTo: string[] }> {
  const tpl = await loadEmailTemplate(slug, 1)

  let subject: string
  let html:    string
  let recipients: { to: string[]; cc: string[]; bcc: string[] }

  if (tpl) {
    if (tpl.audience !== 'admin') {
      console.warn(`[sendAdminTemplate:${slug}] audience attendu 'admin', reçu '${tpl.audience}' — fallback recipient envoyé quand même`)
    }
    subject = tpl.subject ? renderEmailTemplate(tpl.subject, vars) : fallbackSubject
    html    = tpl.htmlBody ? renderEmailTemplate(tpl.htmlBody, vars) : fallbackHtml
    recipients = resolveAdminRecipients(tpl)
  } else {
    subject = fallbackSubject
    html    = fallbackHtml
    // Pas de template → fallback env vars uniquement
    recipients = resolveAdminRecipients({
      audience: 'admin', subject: '', htmlBody: '', plainBody: null,
      recipientTo: '', recipientCc: '', recipientBcc: '',
    } as LoadedEmailTemplate)
  }

  if (recipients.to.length === 0) {
    console.error(`[sendAdminTemplate:${slug}] aucun destinataire (template recipient_to vide + env ADMIN_NOTIF_EMAIL/BLOG_CONTACT_EMAIL/CONTACT_EMAIL non définies)`)
    return { ok: false, sentTo: [] }
  }
  if (recipients.cc.length || recipients.bcc.length) {
    console.warn(`[sendAdminTemplate:${slug}] Cc/Bcc renseignés mais non encore supportés par la queue (${recipients.cc.length}+${recipients.bcc.length} ignorés). À implémenter via colonnes cc/bcc sur cs_email_queue.`)
  }

  const sentTo: string[] = []
  for (const to of recipients.to) {
    try {
      await sendEmailViaQueue({ to, subject, html, templateSlug: slug })
      sentTo.push(to)
    } catch (err: any) {
      console.error(`[sendAdminTemplate:${slug}] enqueue KO pour ${to}:`, err?.message || err)
    }
  }
  return { ok: sentTo.length > 0, sentTo }
}

/**
 * Minimal wrapper for inline HTML fallbacks (same proportions as the
 * sendWelcomeEmail). Reserved for the 4 senders below that do not (yet)
 * have a dedicated styled fallback — if the DB is reachable, the cs_email_template_lang template
 * takes priority anyway.
 */
function buildSimpleFallback(opts: {
  shopName:    string
  title:       string
  intro:       string
  ctaLabel?:   string
  ctaUrl?:     string
  accentColor: string
  footer?:     string
}): string {
  const { shopName, title, intro, ctaLabel, ctaUrl, accentColor, footer } = opts
  const ctaBlock = ctaLabel && ctaUrl
    ? `<div style="margin:24px 0;"><a href="${ctaUrl}" style="display:inline-block;background:${accentColor};color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">${ctaLabel}</a></div>`
    : ''
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:${accentColor};padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;">${title}</h1>
    </div>
    <div style="padding:32px;font-size:14px;color:#475569;line-height:1.6;">
      ${intro}
      ${ctaBlock}
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;">
      ${shopName}${footer ? ' — ' + footer : ''}
    </div>
  </div>
</body></html>`
}

/**
 * Envoie l'email « En attente de virement » — RIB seul, hors mail commande.
 * Useful if a merchant wants to decouple the confirmation and bank transfer reminder
 * (currently bank details are included in order_confirmation
 * — this sender allows a dedicated email if the tenant wishes).
 */
export async function sendPaymentPendingEmail(
  customerEmail: string,
  firstname:     string,
  orderRef:      string,
  bankDetails:   { owner?: string; details?: string; address?: string },
  shopName     = 'Boutique',
  accentColor  = '#4F46E5',
) {
  const ribLines = [
    bankDetails.owner   ? `Bénéficiaire : <strong>${bankDetails.owner}</strong>` : '',
    bankDetails.details ? `Coordonnées : <span style="white-space:pre-line;">${bankDetails.details}</span>` : '',
    bankDetails.address ? `Adresse : <span style="white-space:pre-line;">${bankDetails.address}</span>` : '',
  ].filter(Boolean).join('<br>')

  const tpl = await loadEmailTemplate('order_payment_pending', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, { order_name: `#${orderRef}`, shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      order_name:           `#${orderRef}`,
      bankwire_details_html: ribLines,
      shop_name:            shopName,
      primary_color:        accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html })
  }

  const html = buildSimpleFallback({
    shopName,
    title: `Coordonnées bancaires — Commande #${orderRef}`,
    intro: `<p>Bonjour <strong>${firstname}</strong>,</p>
<p>Pour finaliser votre commande <strong>#${orderRef}</strong>, merci d'effectuer le virement avec les coordonnées suivantes (référence <strong>#${orderRef}</strong> en libellé) :</p>
<div style="background:#eff6ff;border-radius:8px;padding:16px;color:#1e3a8a;font-size:13px;line-height:1.7;">${ribLines || 'RIB à demander au commerçant.'}</div>`,
    accentColor,
  })
  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Coordonnées bancaires — Commande #${orderRef}`,
    html,
  })
}

/**
 * Sends the "Order shipped" email to the customer (tracking + carrier).
 * To be called from the future admin endpoint that marks an order as shipped.
 */
export async function sendOrderShippedEmail(
  customerEmail: string,
  firstname:     string,
  orderRef:      string,
  carrier:       string,
  trackingUrl:   string,
  shopName     = 'Boutique',
  accentColor  = '#4F46E5',
) {
  const tpl = await loadEmailTemplate('order_shipped', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, { order_name: `#${orderRef}`, shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      order_name:    `#${orderRef}`,
      carrier,
      tracking_url:  trackingUrl,
      shop_name:     shopName,
      primary_color: accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html })
  }

  const html = buildSimpleFallback({
    shopName,
    title: `Votre commande #${orderRef} est en route`,
    intro: `<p>Bonjour <strong>${firstname}</strong>,</p>
<p>Bonne nouvelle : votre commande <strong>#${orderRef}</strong> a été expédiée${carrier ? ` via <strong>${carrier}</strong>` : ''}.</p>
${trackingUrl ? '<p>Vous pouvez suivre son acheminement en cliquant sur le bouton ci-dessous.</p>' : ''}`,
    ctaLabel: trackingUrl ? 'Suivre ma commande' : undefined,
    ctaUrl:   trackingUrl || undefined,
    accentColor,
  })
  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Votre commande #${orderRef} est en route — ${shopName}`,
    html,
  })
}

/**
 * Sends the password reset email (tokenized link valid
 * limited in time — the duration + token are produced by the caller).
 */
export async function sendPasswordResetEmail(
  customerEmail: string,
  firstname:     string,
  resetUrl:      string,
  shopName     = 'Boutique',
  accentColor  = '#4F46E5',
) {
  const tpl = await loadEmailTemplate('password_reset', 1)
  if (tpl?.htmlBody) {
    // Date FR humanisée pour le placeholder `{date}` ("6 mai 2026").
    // Format court préféré au DateTime complet — l'email rappelle juste
    // au visiteur quand il a fait la demande.
    const dateLabel = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    const subject = renderEmailTemplate(tpl.subject, { shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      // `reset_url` (canonique AC) + `url` (alias templates tenant
      // Example Shop v2). Garder les deux pour rester tolérant aux variations
      // de placeholder entre templates édités via /hub/crm/email/template.
      reset_url:     resetUrl,
      url:           resetUrl,
      date:          dateLabel,
      shop_name:     shopName,
      primary_color: accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html })
  }

  const html = buildSimpleFallback({
    shopName,
    title: 'Réinitialisation de votre mot de passe',
    intro: `<p>Bonjour <strong>${firstname}</strong>,</p>
<p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
<p style="font-size:12px;color:#94a3b8;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe restera inchangé.</p>`,
    ctaLabel: 'Réinitialiser mon mot de passe',
    ctaUrl:   resetUrl,
    accentColor,
  })
  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Réinitialisation de votre mot de passe — ${shopName}`,
    html,
  })
}

/**
 * Sends the password change confirmation (security alert).
 * Called after a successful POST `/api/catalogue/customer/password-reset` —
 * closes the reset loop: the customer knows that the change
 * is effective and can alert if it was not them.
 *
 * Vars de template `password_changed` rendues : firstname, date,
 * shop_name, primary_color.
 */
export async function sendPasswordChangedEmail(
  customerEmail: string,
  firstname:     string,
  shopName     = 'Boutique',
  accentColor  = '#4F46E5',
) {
  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const tpl = await loadEmailTemplate('password_changed', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, { shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname,
      date:          dateLabel,
      shop_name:     shopName,
      primary_color: accentColor,
    })
    return sendEmailViaQueue({ to: customerEmail, subject, html, templateSlug: 'password_changed' })
  }

  // Fallback HTML inline si template DB absent (déploiement avant seed).
  const html = buildSimpleFallback({
    shopName,
    title: 'Mot de passe modifié',
    intro: `<p>Bonjour <strong>${firstname}</strong>,</p>
<p>Le mot de passe de votre compte vient d'être modifié avec succès le ${dateLabel}.</p>
<p style="font-size:12px;color:#94a3b8;">Si vous n'êtes pas à l'origine de ce changement, contactez-nous immédiatement — nous bloquerons votre compte le temps de l'enquête.</p>`,
    accentColor,
  })
  return sendEmailViaQueue({
    to: customerEmail,
    subject: `Votre mot de passe a été modifié — ${shopName}`,
    html,
    templateSlug: 'password_changed',
  })
}

/**
 * Sends an abandoned cart recovery email. Called manually from
 * `/hub/carts/abandoned` (Resend button). Goes through the queue
 * (cs_email_queue) — visible in `/hub/crm/email` tab Queue + History.
 *
 * Vars de template `cart_recovery` rendues : firstname, salutation,
 * items_count, items_label, total_ht, cart_url, shop_name, primary_color.
 *
 * Test mode (subject prefixed [TEST {id_cart}]): the caller passes `subjectPrefix`
 * + `to` override to redirect to their address without logging conversion.
 */
export async function sendCartRecoveryEmail(opts: {
  to:            string
  firstname:     string
  salutation:    string
  itemsCount:    number
  totalHt:       string
  cartUrl:       string
  shopName?:     string
  accentColor?:  string
  subjectPrefix?: string
}) {
  const shopName    = opts.shopName    ?? 'Boutique'
  const accentColor = opts.accentColor ?? '#4F46E5'
  const itemsLabel  = opts.itemsCount > 1 ? 'articles' : 'article'

  const vars = {
    firstname:     opts.firstname,
    salutation:    opts.salutation,
    items_count:   opts.itemsCount,
    items_label:   itemsLabel,
    total_ht:      opts.totalHt,
    cart_url:      opts.cartUrl,
    shop_name:     shopName,
    primary_color: accentColor,
  }

  const tpl = await loadEmailTemplate('cart_recovery', 1)
  let subject: string
  let html:    string
  if (tpl?.htmlBody) {
    subject = renderEmailTemplate(tpl.subject || 'Votre panier vous attend — {items_count} {items_label} en attente', vars)
    html    = renderEmailTemplate(tpl.htmlBody, vars)
  } else {
    // Fallback minimaliste si template DB absent (déploiement avant seed).
    subject = `Votre panier vous attend — ${opts.itemsCount} ${itemsLabel} en attente`
    html    = buildSimpleFallback({
      shopName,
      title: 'Votre panier vous attend',
      intro: `<p>${opts.salutation},</p>
<p>Vous avez constitué un panier sur <strong>${shopName}</strong> il y a quelques jours, mais vous n'avez pas finalisé votre commande.</p>
<p style="background:#f5f5f0;padding:15px;border-left:4px solid ${accentColor};">
  <strong>${opts.itemsCount} ${itemsLabel}</strong> en attente — montant estimé&nbsp;: <strong>${opts.totalHt}</strong>
</p>`,
      ctaLabel: 'Reprendre mon panier',
      ctaUrl:   opts.cartUrl,
      accentColor,
    })
  }

  if (opts.subjectPrefix) subject = `${opts.subjectPrefix} ${subject}`

  return sendEmailViaQueue({
    to:           opts.to,
    subject,
    html,
    templateSlug: 'cart_recovery',
  })
}

/**
 * Sends a reminder on a pending quote (not converted to order).
 * B2B counterpart of sendCartRecoveryEmail. Called manually
 * from `/hub/carts/abandoned` tab Quotes. Pushed to the queue (visible
 * /hub/crm/email tab Queue + Historique).
 *
 * Vars de template `quote_followup` rendues : firstname, salutation, company,
 * quote_ref, age_days, age_days_plural, items_count, items_count_plural,
 * total_ht, rdv_url, shop_name, primary_color.
 *
 * Mode test : subjectPrefix `[TEST Q-{id}]` + `to` override.
 */
export async function sendQuoteFollowupEmail(opts: {
  to:            string
  firstname:     string
  salutation:    string
  company:       string
  quoteRef:      string
  ageDays:       number
  itemsCount:    number
  totalHt:       string
  rdvUrl:        string
  shopName?:     string
  accentColor?:  string
  subjectPrefix?: string
}) {
  const shopName    = opts.shopName    ?? 'Boutique'
  const accentColor = opts.accentColor ?? '#4F46E5'

  const vars = {
    firstname:           opts.firstname,
    salutation:          opts.salutation,
    company:             opts.company || shopName,
    quote_ref:           opts.quoteRef,
    age_days:            opts.ageDays,
    age_days_plural:     opts.ageDays > 1 ? 's' : '',
    items_count:         opts.itemsCount,
    items_count_plural:  opts.itemsCount > 1 ? 's' : '',
    total_ht:            opts.totalHt,
    rdv_url:             opts.rdvUrl,
    shop_name:           shopName,
    primary_color:       accentColor,
  }

  const tpl = await loadEmailTemplate('quote_followup', 1)
  let subject: string
  let html:    string
  if (tpl?.htmlBody) {
    subject = renderEmailTemplate(tpl.subject || 'Suite à votre demande de devis {quote_ref}', vars)
    html    = renderEmailTemplate(tpl.htmlBody, vars)
  } else {
    subject = `Suite à votre demande de devis ${opts.quoteRef} — souhaitez-vous avancer ?`
    html    = buildSimpleFallback({
      shopName,
      title: 'Suite à votre demande de devis',
      intro: `<p>${opts.salutation},</p>
<p>Vous avez fait une demande de devis pour <strong>${opts.company || shopName}</strong> il y a ${opts.ageDays} jour${opts.ageDays > 1 ? 's' : ''} et nous n'avons pas encore eu votre retour.</p>
<p style="background:#f5f5f0;padding:15px;border-left:4px solid ${accentColor};">
  <strong>${opts.itemsCount} produit${opts.itemsCount > 1 ? 's' : ''}</strong> — total catalogue&nbsp;: <strong>${opts.totalHt}</strong>
</p>
<p>Souhaitez-vous que nous avancions sur la proposition&nbsp;?</p>`,
      ctaLabel: 'Prendre rendez-vous',
      ctaUrl:   opts.rdvUrl,
      accentColor,
    })
  }

  if (opts.subjectPrefix) subject = `${opts.subjectPrefix} ${subject}`

  return sendEmailViaQueue({
    to:           opts.to,
    subject,
    html,
    templateSlug: 'quote_followup',
  })
}

/**
 * Sends an acknowledgment to the visitor after submitting a
 * B2B quote request. Wired to the QUOTE_REQUESTED event (NotifyCustomerHandler).
 *
 * Vars de template `quote_request` rendues : firstname, company, quote_ref,
 * quote_items_html, quote_total, valid_until, total_items, shop_name,
 * primary_color, quote_pdf_url.
 */
export async function sendQuoteRequestEmail(opts: {
  customerEmail: string
  firstname:     string
  company:       string
  quoteRef:      string
  totalItems:    number
  shopName?:     string
  accentColor?:  string
  /** Bloc HTML pré-construit des items (table). Cf NotifyCustomerHandler. */
  itemsHtml?:    string
  /** Total displayed — "Upon request" until the sales representative quotes it. */
  total?:        string
  /** Validity date formatted (e.g.: "5 juin 2026"). */
  validUntil?:   string
  /** Absolute URL of the summary PDF (optional — empty until wired up). */
  quotePdfUrl?:  string
  /** Absolute URL of the pre-filled appointment page with quote info. */
  rdvUrl?:       string
  /** Deferred quote PDF generation by the worker queue. Avoids the
   * synchronous generation on the HTTP side — the visitor doesn't bear the PDFKit cost. */
  quoteIdForPdf?: number
}) {
  const shopName    = opts.shopName    ?? 'Boutique'
  const accentColor = opts.accentColor ?? '#4F46E5'
  const itemsHtml   = opts.itemsHtml   ?? ''
  const total       = opts.total       ?? 'Sur devis — proposition tarifaire à venir'
  const validUntil  = opts.validUntil  ?? ''
  const quotePdfUrl = opts.quotePdfUrl ?? ''
  const rdvUrl      = opts.rdvUrl      ?? ''

  const tpl = await loadEmailTemplate('quote_request', 1)
  if (tpl?.htmlBody) {
    const subject = renderEmailTemplate(tpl.subject, { quote_ref: opts.quoteRef, shop_name: shopName })
    const html = renderEmailTemplate(tpl.htmlBody, {
      firstname:        opts.firstname,
      company:          opts.company,
      quote_ref:        opts.quoteRef,
      quote_items_html: itemsHtml,
      quote_total:      total,
      valid_until:      validUntil,
      total_items:      opts.totalItems,
      shop_name:        shopName,
      primary_color:    accentColor,
      quote_pdf_url:    quotePdfUrl,
      rdv_url:          rdvUrl,
    })
    // Deferred PDF generation: just passes a meta `{type:'quote_pdf',
    // quoteId}` to the queue. The `processEmailQueue` worker generates the PDF
    // at send time → cost off the HTTP critical path.
    return sendEmailViaQueue({
      to:           opts.customerEmail,
      subject,
      html,
      templateSlug: 'quote_request',
      ...(opts.quoteIdForPdf
        ? { attachmentMeta: { type: 'quote_pdf', quoteId: opts.quoteIdForPdf } }
        : {}),
    })
  }

  const itemsBlock = itemsHtml || `<p>Vous avez sélectionné <strong>${opts.totalItems} produit${opts.totalItems > 1 ? 's' : ''}</strong> dans votre demande.</p>`
  const validityBlock = validUntil ? `<p style="font-size:13px;color:#64748b;">Devis valable jusqu'au <strong>${validUntil}</strong>.</p>` : ''
  const html = buildSimpleFallback({
    shopName,
    title: `Votre demande de devis ${opts.quoteRef}`,
    intro: `<p>Bonjour <strong>${opts.firstname}</strong>,</p>
<p>Nous avons bien reçu votre demande de devis pour <strong>${opts.company}</strong> (référence <strong>${opts.quoteRef}</strong>).</p>
${itemsBlock}
<p style="margin-top:16px;"><strong>Total :</strong> ${total}</p>
${validityBlock}
<p>Notre équipe revient vers vous sous 24-48h ouvrées avec une proposition tarifaire détaillée.</p>`,
    accentColor,
    footer: 'Cet email confirme la réception de votre demande.',
  })
  return sendEmailViaQueue({
    to: opts.customerEmail,
    subject: `Votre demande de devis ${opts.quoteRef} — ${shopName}`,
    html,
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Senders ADMIN — destinataires lus depuis cs_email_template.recipient_to
// (fallback env). Multi-recipient support (1 enqueue per address).
// ─────────────────────────────────────────────────────────────────────────

/**
 * Notifies the admin of a new message received via `/contact` (blog or public form).
 * Available vars in the template: {firstname}, {lastname}, {email}, {phone}, {message},
 * {article_title}, {article_url}, {lead_id}, {project_id}, {date}.
 */
export async function sendAdminContactFormEmail(opts: {
  firstname?:    string
  lastname?:     string
  email:         string
  phone?:        string
  message?:      string
  articleTitle?: string
  articleUrl?:   string
  leadId?:       number | null
  projectId?:    number | null
}) {
  const date = new Date().toLocaleString('fr-FR')
  const fbHtml = buildSimpleFallback({
    shopName: 'Admin',
    title: '📝 Nouveau contact',
    intro: `<p><strong>De :</strong> ${opts.firstname || ''} ${opts.lastname || ''} &lt;${opts.email}&gt;</p>
${opts.phone ? `<p><strong>Téléphone :</strong> ${opts.phone}</p>` : ''}
${opts.articleTitle ? `<p><strong>Article :</strong> <a href="${opts.articleUrl || '#'}">${opts.articleTitle}</a></p>` : ''}
${opts.message ? `<p><strong>Message :</strong></p><blockquote style="border-left:3px solid #e2e8f0;margin:8px 0;padding-left:12px;color:#475569;white-space:pre-line;">${opts.message}</blockquote>` : ''}
<p style="font-size:12px;color:#94a3b8;">Lead #${opts.leadId ?? 'N/A'} · Projet #${opts.projectId ?? 'N/A'} · ${date}</p>`,
    accentColor: '#7C3AED',
  })

  return sendAdminTemplate(
    'admin_contact_form',
    `[Contact] ${opts.firstname || ''} ${opts.lastname || ''} — ${opts.email}`.slice(0, 200),
    fbHtml,
    {
      firstname:     opts.firstname    ?? '',
      lastname:      opts.lastname     ?? '',
      email:         opts.email,
      phone:         opts.phone        ?? '',
      message:       opts.message      ?? '',
      article_title: opts.articleTitle ?? '',
      article_url:   opts.articleUrl   ?? '',
      lead_id:       opts.leadId       ?? '',
      project_id:    opts.projectId    ?? '',
      date,
    },
  )
}

/**
 * Notifies the admin that a new order has been placed. Called after
 * createOrder() (api/orders/create.post.ts). Vars : {order_name}, {customer_name},
 * {customer_email}, {total_paid}, {payment}, {date}.
 */
export async function sendAdminNewOrderEmail(opts: {
  orderRef:       string
  customerName:   string
  customerEmail:  string
  totalPaid:      number
  payment:        string
  shopName?:      string
  firstname?:     string
  lastname?:      string
  company?:       string
  idOrder?:       number
}) {
  const date = new Date().toLocaleString('fr-FR')
  const totalPaidStr = formatPrice(opts.totalPaid)
  // était vide. Le template attend {firstname}{lastname}{company}{customer_email}
  // {id_order}. Backward-compat : on garde aussi customer_name composite.
  const firstname = opts.firstname || (opts.customerName.split(' ')[0] || '')
  const lastname  = opts.lastname  || (opts.customerName.split(' ').slice(1).join(' ') || '')
  const fbHtml = buildSimpleFallback({
    shopName: opts.shopName || 'Boutique',
    title: `🛒 Nouvelle commande #${opts.orderRef}`,
    intro: `<p><strong>Client :</strong> ${opts.customerName} &lt;${opts.customerEmail}&gt;</p>
${opts.company ? `<p><strong>Société :</strong> ${opts.company}</p>` : ''}
<p><strong>Montant :</strong> ${totalPaidStr}</p>
<p><strong>Paiement :</strong> ${opts.payment}</p>
<p style="font-size:12px;color:#94a3b8;">${date}</p>`,
    accentColor: '#0ea5e9',
  })

  // Bloc société conditionnel : vide si pas de company. Convention `_html`
  // pour injection brute via la whitelist du renderer.
  const companyLineHtml = opts.company
    ? `<p style="margin:0 0 8px;font-size:13px;color:#475569;">${String(opts.company).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] || c))}</p>`
    : ''

  return sendAdminTemplate(
    'admin_new_order',
    `[Admin] Nouvelle commande #${opts.orderRef} — ${opts.customerName}`.slice(0, 200),
    fbHtml,
    {
      order_name:        `#${opts.orderRef}`,
      customer_name:     opts.customerName,
      customer_email:    opts.customerEmail,
      firstname,
      lastname,
      company:           opts.company || '',
      company_line_html: companyLineHtml,
      total_paid:        totalPaidStr,
      payment:           opts.payment,
      shop_name:         opts.shopName || 'Boutique',
      date,
      id_order:          opts.idOrder ? String(opts.idOrder) : '',
    },
  )
}

/**
 * Notifies the admin of a new B2B quote request (handler subscribed to
 * QUOTE_REQUESTED). Vars : {customer_name}, {company}, {email}, {phone},
 * {total_items}, {quote_ref}, {message}, {date}.
 */
export async function sendAdminNewLeadEmail(opts: {
  firstname:    string
  lastname:     string
  email:        string
  phone?:       string
  company:      string
  totalItems:   number
  quoteRef:     string
  message?:     string
}) {
  const date = new Date().toLocaleString('fr-FR')
  const customerName = `${opts.firstname} ${opts.lastname}`.trim()
  const fbHtml = buildSimpleFallback({
    shopName: 'Admin',
    title: `🎯 Nouveau lead — ${customerName}`,
    intro: `<p><strong>Société :</strong> ${opts.company}</p>
<p><strong>Contact :</strong> ${customerName} &lt;${opts.email}&gt;${opts.phone ? ` · ${opts.phone}` : ''}</p>
<p><strong>Devis :</strong> ${opts.quoteRef} (${opts.totalItems} produit${opts.totalItems > 1 ? 's' : ''})</p>
${opts.message ? `<p><strong>Message :</strong></p><blockquote style="border-left:3px solid #e2e8f0;margin:8px 0;padding-left:12px;color:#475569;white-space:pre-line;">${opts.message}</blockquote>` : ''}
<p style="font-size:12px;color:#94a3b8;">${date}</p>`,
    accentColor: '#10b981',
  })

  return sendAdminTemplate(
    'admin_new_lead',
    `[Admin] Nouveau lead — ${customerName} (${opts.company})`.slice(0, 200),
    fbHtml,
    {
      firstname:     opts.firstname,
      lastname:      opts.lastname,
      customer_name: customerName,
      email:         opts.email,
      phone:         opts.phone   ?? '',
      company:       opts.company,
      total_items:   opts.totalItems,
      quote_ref:     opts.quoteRef,
      message:       opts.message ?? '',
      date,
    },
  )
}
