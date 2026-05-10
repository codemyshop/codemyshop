/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/quote-followup?ageMinDays=3&ageMaxDays=90&valueMin=0
 *
 * List of unconverted quote requests (status='pending') to follow up on.
 * Counterpart to abandoned cart but for B2B leads: a visitor submitted a
 * quote via /devis and did not convert to an order/project. Volume metrics
 * Example Shop v2 : ~23 pending au 2026-05-06.
 *
 * Return: counters by age bracket + filtered list. Items + estimated total
 * via JOIN cs_quote_request_item × ps_product (prix catalogue B2B).
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const ageMinDays = Math.max(0, Number(q.ageMinDays) || 0)
  const ageMaxDays = Math.min(365, Number(q.ageMaxDays) || 90)
  const valueMin = Math.max(0, Number(q.valueMin) || 0)

  const db = useClientDb(event)

  // Counters par tranche d'âge (jours).
  // age_days = TIMESTAMPDIFF(DAY, qr.date_add, NOW()) — adapter PG porte.
  const buckets = await db.query<any>(`
    SELECT
      SUM(CASE WHEN aged < 3 THEN 1 ELSE 0 END)               AS bucket_0_3d,
      SUM(CASE WHEN aged >= 3 AND aged < 7 THEN 1 ELSE 0 END) AS bucket_3_7d,
      SUM(CASE WHEN aged >= 7 AND aged < 30 THEN 1 ELSE 0 END) AS bucket_7_30d,
      SUM(CASE WHEN aged >= 30 THEN 1 ELSE 0 END)             AS bucket_30d_plus,
      SUM(value_eur) AS value_total,
      COUNT(*) AS total
    FROM (
      SELECT qr.id_quote_request,
             TIMESTAMPDIFF(DAY, qr.date_add, NOW()) AS aged,
             COALESCE(SUM(qri.quantity * pp.price), 0) AS value_eur
        FROM cs_quote_request qr
        LEFT JOIN cs_quote_request_item qri ON qri.id_quote_request = qr.id_quote_request
        LEFT JOIN ps_product pp ON pp.id_product = qri.id_product
       WHERE qr.status = 'pending'
       GROUP BY qr.id_quote_request, qr.date_add
    ) sub
  `)
  const counters = buckets[0] || {}

  // Liste devis pending filtrés.
  const ageFilter = `TIMESTAMPDIFF(DAY, qr.date_add, NOW()) BETWEEN ${ageMinDays} AND ${ageMaxDays}`
  const valueFilter = valueMin > 0 ? `AND COALESCE(SUM(qri.quantity * pp.price), 0) >= ${valueMin}` : ''

  const quotes = await db.query<any>(`
    SELECT
      qr.id_quote_request,
      qr.id_customer,
      qr.firstname,
      qr.lastname,
      qr.email,
      qr.phone,
      qr.company,
      qr.siret,
      qr.activite,
      qr.message,
      qr.status,
      qr.date_add,
      TIMESTAMPDIFF(DAY, qr.date_add, NOW()) AS age_days,
      COUNT(qri.id_quote_request_item) AS items_count,
      COALESCE(SUM(qri.quantity * pp.price), 0) AS total_estimated
    FROM cs_quote_request qr
    LEFT JOIN cs_quote_request_item qri ON qri.id_quote_request = qr.id_quote_request
    LEFT JOIN ps_product pp ON pp.id_product = qri.id_product
    WHERE qr.status = 'pending'
      AND ${ageFilter}
    GROUP BY qr.id_quote_request, qr.id_customer, qr.firstname, qr.lastname, qr.email,
             qr.phone, qr.company, qr.siret, qr.activite, qr.message, qr.status, qr.date_add
    HAVING COUNT(qri.id_quote_request_item) > 0 ${valueFilter}
    ORDER BY total_estimated DESC, qr.date_add ASC
    LIMIT 500
  `)

  return {
    ok: true,
    counters: {
      bucket_0_3d:    Number(counters.bucket_0_3d)    || 0,
      bucket_3_7d:    Number(counters.bucket_3_7d)    || 0,
      bucket_7_30d:   Number(counters.bucket_7_30d)   || 0,
      bucket_30d_plus: Number(counters.bucket_30d_plus) || 0,
      value_total:    Number(counters.value_total)    || 0,
      total:          Number(counters.total)          || 0,
    },
    quotes,
  }
})
