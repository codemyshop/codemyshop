/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/bo/email-templates/:slug/test-send
 *
 * Sends a template test to a custom email address (entered from the back office
 * /hub/crm/email/template/:slug). Loads the current database version (subject +
 * html_body) and substitutes with plausible example values per slug
 * so the rendering reflects what the final recipient will see.
 *
 * Body : { id_lang: number, to: string }
 *
 * Security: no real customer data is used — only the
 * sample vars defined below. EMAIL_OVERRIDE_TO on the sendEmail() side applies
 * normalement (preprod redirect intacte).
 */

import { sendEmailViaQueue } from '~/server/utils/email-queue'
import { loadEmailTemplate } from '~/server/utils/email-template-loader'
import { renderEmailTemplate } from '~/server/utils/email-template-render'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

/** Sample vars par slug — valeurs représentatives d'un envoi réel. */
const SAMPLE_PRODUCTS_TABLE = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
<thead>
<tr style="background:#f8fafc;">
<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Produit</th>
<th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Qté</th>
<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">Total TTC</th>
</tr>
</thead>
<tbody>
<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">Olives noires Kalamata 5kg</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;color:#475569;">3</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;">189,00 €</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">Pistaches d'Iran 10kg</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;color:#475569;">2</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;">412,80 €</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">Abricots secs Turquie 10kg</td><td style="padding:8px 12px;font-size:13px;text-align:center;color:#475569;">1</td><td style="padding:8px 12px;font-size:13px;text-align:right;color:#0f172a;">87,75 €</td></tr>
</tbody>
</table>`

const COMMON_VARS = {
  firstname: 'Marie',
  lastname:  'Dupont',
  email:     'marie.dupont@exemple-pro.fr',
  company:   'Acme Distribution SAS',
}

const SAMPLE_VARS_BY_SLUG: Record<string, Record<string, string>> = {
  account_confirmation: {
    ...COMMON_VARS,
  },
  order_confirmation: {
    ...COMMON_VARS,
    order_name:          '#PAL2026-1234',
    date:                new Date().toLocaleDateString('fr-FR'),
    products:            SAMPLE_PRODUCTS_TABLE,
    total_paid:          '789,55 €',
    total_products:      '689,55 €',
    total_shipping:      '100,00 €',
    delivery_block_html: 'Marie Dupont<br>12 rue du Marché<br>75011 Paris',
    payment:             'Virement bancaire',
    carrier:             'Chronopost Express',
    history_url:         '#test-link-historique',
  },
  order_payment_pending: {
    ...COMMON_VARS,
    order_name:        '#PAL2026-1234',
    bankwire_owner:    'Example Shop SARL',
    bankwire_details:  'IBAN : FR76 1234 5678 9012 3456 7890 123\nBIC : ABCDEFGHIJK',
    bankwire_address:  '15 av. de la République, 75011 Paris',
    total_paid:        '789,55 €',
    history_url:       '#test-link-historique',
  },
  password_reset: {
    firstname:  'Marie',
    date:       new Date().toLocaleDateString('fr-FR'),
    url:        '#test-link-reset-password',
  },
  order_shipped: {
    ...COMMON_VARS,
    order_name:    '#PAL2026-1234',
    date:          new Date().toLocaleDateString('fr-FR'),
    history_url:   '#test-link-historique',
  },
  quote_request: {
    ...COMMON_VARS,
    quote_ref:         'DV2026-0042',
    valid_until:       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
    quote_items_html:  SAMPLE_PRODUCTS_TABLE,
    quote_total:       '1 230,00 €',
    quote_url:         '#test-link-devis',
    quote_pdf_url:     '#test-link-pdf',
  },
  admin_new_order: {
    ...COMMON_VARS,
    order_name:  '#PAL2026-1234',
    date:        new Date().toLocaleDateString('fr-FR'),
    total_paid:  '789,55 €',
    products:    SAMPLE_PRODUCTS_TABLE,
    id_order:    '1234',
  },
  admin_contact_form: {
    ...COMMON_VARS,
    message:     'Bonjour, je souhaiterais obtenir un devis pour 50kg d\'olives Kalamata + 20kg de pistaches premium. Livraison Paris 11e dans la semaine si possible. Merci de me recontacter.',
  },
  admin_stock_alert: {
    product_name:      'Olives noires Kalamata 5kg',
    product_reference: 'OLV-KAL-5KG-A',
  },
}

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug requis' })

  const body = await readBody(event) as { id_lang?: number; to?: string }
  const idLang = Number(body?.id_lang ?? 1)
  const to = String(body?.to || '').trim()

  if (!to || !EMAIL_RE.test(to)) {
    throw createError({ statusCode: 422, statusMessage: 'Email destinataire invalide' })
  }

  const tpl = await loadEmailTemplate(slug, idLang)
  if (!tpl) {
    throw createError({
      statusCode: 404,
      statusMessage: `Template ${slug} (lang ${idLang}) introuvable en DB`,
    })
  }

  const sampleVars = SAMPLE_VARS_BY_SLUG[slug] ?? COMMON_VARS

  const subject = `[TEST] ${renderEmailTemplate(tpl.subject, sampleVars)}`
  const html = renderEmailTemplate(tpl.htmlBody, sampleVars)

  // Queue instead of sending directly: test goes through the queue, the admin
  // sees the test arrive in /hub/crm/email tab Send Queue (then sent
  // by the 60s cron or via the "Process now" button to avoid waiting).
  const result = await sendEmailViaQueue({
    to, subject, html,
    templateSlug: slug, idLang,
  })
  if (!result.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Enqueue échoué : ${result.error || 'erreur DB'}`,
    })
  }

  return {
    ok: true,
    id: result.id,
    to,
    slug,
    id_lang: idLang,
    sample_vars_count: Object.keys(sampleVars).length,
    queued: true,
  }
})
