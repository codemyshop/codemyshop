

import { useClientDb } from '~/server/utils/db'
import { ADDIFY_ACTIVITY_FIELD_NAME, labelForActivityCode, normalizeLegacyActivityCode } from '~/utils/customerActivity'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const customerId = Number(id)
  if (!Number.isFinite(customerId) || customerId <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }

  const db = useClientDb(event)

  const customer = await db.get<any>(`
    SELECT
      c.id_customer AS id,
      c.firstname, c.lastname, c.email,
      c.company, c.siret, c.ape, c.website, c.note,
      c.active, c.newsletter, c.optin,
      c.id_default_group AS defaultGroupId,
      c.outstanding_allow_amount AS outstandingAmount,
      c.max_payment_days AS maxPaymentDays,
      c.date_add AS dateAdd,
      c.date_upd AS dateUpd
    FROM ps_customer c
    WHERE c.id_customer = ? AND c.deleted = 0
  `, [customerId])

  if (!customer) throw createError({ statusCode: 404, message: 'Client introuvable' })

  
  
  
  
  
  const addresses = await db.query<any>(`
    SELECT
      a.id_address AS id,
      a.alias,
      a.company,
      a.firstname,
      a.lastname,
      a.address1,
      a.address2,
      a.postcode,
      a.city,
      a.id_country AS countryId,
      a.id_state AS stateId,
      a.phone,
      a.phone_mobile AS phoneMobile,
      a.vat_number AS vatNumber,
      a.date_add AS dateAdd
    FROM ps_address a
    WHERE a.id_customer = ? AND a.deleted = 0 AND a.active = 1
    ORDER BY a.id_address DESC
  `, [customerId])

  const billingAddress = addresses[0] || null

  
  
  
  
  const groupRows = await db.query<any>(`
    SELECT id_group AS id FROM ps_customer_group WHERE id_customer = ?
  `, [customerId])
  const groupIds = groupRows.map((r: any) => Number(r.id)).filter(Boolean)

  
  const orders = await db.query<any>(`
    SELECT
      o.id_order AS id,
      o.reference,
      o.id_customer AS customerId,
      o.current_state AS statusId,
      o.payment,
      ROUND(o.total_paid_tax_excl, 2) AS totalPaidHT,
      ROUND(o.total_paid_tax_incl, 2) AS totalPaidTTC,
      ROUND(o.total_shipping, 2) AS totalShipping,
      ROUND(o.total_products, 2) AS totalProducts,
      o.date_add AS dateAdd
    FROM ps_orders o
    WHERE o.id_customer = ? AND o.valid = 1
    ORDER BY o.id_order DESC
    LIMIT 20
  `, [customerId])

  
  
  
  
  
  
  const { getCustomerActivityCode } = await import('~/modules/customer-extra/server/utils/customer-extra')
  let activityCode: string | null = await getCustomerActivityCode(customerId, { event })

  if (!activityCode) {
    try {
      const legacy = await db.get<{ field_value: string | null }>(`
        SELECT field_value
        FROM ps_addifycustomercustomdata
        WHERE id_customer = ? AND field_name = ?
        ORDER BY id_data DESC LIMIT 1
      `, [customerId, ADDIFY_ACTIVITY_FIELD_NAME])
      activityCode = normalizeLegacyActivityCode(legacy?.field_value)
    } catch (err: any) {
      if (err?.code !== 'ER_NO_SUCH_TABLE' && err?.errno !== 1146) {
        console.warn('[customers/:id] addify fallback read error:', err?.message)
      }
    }
  }

  return {
    ...customer,
    billingAddress,
    groupIds,
    addresses,
    orders,
    extra: {
      activityCode,
      activityLabel: labelForActivityCode(activityCode),
    },
  }
})
