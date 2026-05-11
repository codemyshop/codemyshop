

import { useClientDb, resolveClientId } from '~/server/utils/db'
import { sendQuoteFollowupEmail } from '~/server/utils/order-emails'
import { signQuoteRdvToken } from '~/server/utils/quote-rdv-token'

interface QuoteRow {
  id_quote_request: number
  firstname: string
  lastname: string
  email: string
  company: string | null
  age_days: number
  items_count: number
  total_estimated: number
}

const SHOP_URLS: Record<string, string> = {
  'example-shop':       'https://example-shop-nuxt.codemyshop.com',
  'ac-hub':           'https://codemyshop.com',
  'codemyshop':       'https://codemyshop.com',
  'example-vape': 'https://example-vape.com',
}
const SHOP_NAMES: Record<string, string> = {
  'example-shop':       'Example Shop',
  'ac-hub':           'CodeMyShop',
  'codemyshop':       'CodeMyShop',
  'example-vape': 'Example Vape',
}
const SHOP_COLORS: Record<string, string> = {
  'example-shop':       '#81a20e',
  'ac-hub':           '#4F46E5',
  'codemyshop':       '#4F46E5',
  'example-vape': '#4F46E5',
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n) + ' HT'
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id_quotes?: number[]; test_email?: string }>(event)
  const ids = (body?.id_quotes || []).map(Number).filter(Number.isFinite)
  if (!ids.length) {
    throw createError({ statusCode: 400, message: 'id_quotes requis (array d\'int)' })
  }
  const testEmail = (body?.test_email || '').trim()
  if (testEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    throw createError({ statusCode: 400, message: 'test_email invalide' })
  }

  const tenant    = resolveClientId(event)
  const db        = useClientDb(event)
  const shopUrl   = SHOP_URLS[tenant]   || 'https://example-shop-nuxt.codemyshop.com'
  const shopName  = SHOP_NAMES[tenant]  || 'Boutique'
  const shopColor = SHOP_COLORS[tenant] || '#4F46E5'

  const idsCsv = ids.map(Number).join(',')
  const quotes = await db.query<QuoteRow>(`
    SELECT
      qr.id_quote_request,
      qr.firstname,
      qr.lastname,
      qr.email,
      qr.company,
      TIMESTAMPDIFF(DAY, qr.date_add, NOW()) AS age_days,
      COUNT(qri.id_quote_request_item) AS items_count,
      COALESCE(SUM(qri.quantity * pp.price), 0) AS total_estimated
    FROM cs_quote_request qr
    LEFT JOIN cs_quote_request_item qri ON qri.id_quote_request = qr.id_quote_request
    LEFT JOIN ps_product pp ON pp.id_product = qri.id_product
    WHERE qr.id_quote_request IN (${idsCsv})
    GROUP BY qr.id_quote_request, qr.firstname, qr.lastname, qr.email, qr.company, qr.date_add
    HAVING COUNT(qri.id_quote_request_item) > 0
  `)

  let queued = 0
  let errors = 0
  const isTest = !!testEmail

  for (const quote of quotes) {
    if (!isTest && !quote.email) {
      errors++
      continue
    }

    const firstname = (quote.firstname || '').trim() || 'Bonjour'
    const company = (quote.company || '').trim()
    const salutation = `Bonjour ${firstname}` + (company ? ` (${company})` : '')
    const quoteRef = `Q-${quote.id_quote_request}`
    const rdvToken = signQuoteRdvToken(quote.id_quote_request)
    const rdvUrl = `${shopUrl}/rdv?quote=${quote.id_quote_request}&t=${rdvToken}`
    const totalHt = formatPrice(Number(quote.total_estimated))
    const to = isTest ? testEmail : quote.email
    const subjectPrefix = isTest ? `[TEST ${quoteRef}]` : ''

    try {
      await sendQuoteFollowupEmail({
        to,
        firstname,
        salutation,
        company:       company || shopName,
        quoteRef,
        ageDays:       Number(quote.age_days) || 0,
        itemsCount:    Number(quote.items_count),
        totalHt,
        rdvUrl,
        shopName,
        accentColor:   shopColor,
        subjectPrefix,
      })
      queued++

      if (!isTest) {
        try {
          await db.run(
            `INSERT INTO cs_quote_recovery (id_quote_request, sent_at, status)
                  VALUES (?, NOW(), 'queued')`,
            [quote.id_quote_request],
          )
        } catch (err: any) {
          
          console.warn('[quote-followup] log INSERT skipped:', err?.message)
        }
      }
    } catch (err: any) {
      errors++
      console.error(`[quote-followup/send] enqueue KO Q-${quote.id_quote_request}:`, err?.message || err)
      if (!isTest) {
        try {
          await db.run(
            `INSERT INTO cs_quote_recovery (id_quote_request, sent_at, status, error_msg)
                  VALUES (?, NOW(), 'error', ?)`,
            [quote.id_quote_request, String(err?.message || err).slice(0, 500)],
          )
        } catch {  }
      }
    }
  }

  return {
    ok: true,
    queued,
    sent: queued,           
    errors,
    total: quotes.length,
    test_mode: isTest,
  }
})
