/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/sav/:id — support ticket details (Sprint 16).
 *
 * Retourne :
 *   - thread        : ligne ps_customer_thread + alias customerName + orderReference
 * - customer      : basic identity + stats (id_customer may be NULL
 * if the ticket comes from the public contact form)
 * - order         : simplified ps_orders row if id_order is present
 * - messages      : timeline sorted by date_add ASC, with `fromEmployee` flag
 * computed (id_employee IS NOT NULL) → the UI places
 * team replies on the right and client messages
 * on the left.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const threadId = Number(id)
  if (!Number.isFinite(threadId) || threadId <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }

  const db = useClientDb(event)

  const thread = await db.get<any>(`
    SELECT
      ct.id_customer_thread AS id,
      ct.id_customer        AS customerId,
      ct.id_order           AS orderId,
      ct.id_contact         AS contactId,
      ct.id_lang            AS langId,
      ct.email,
      ct.status,
      ct.token,
      ct.date_add           AS dateAdd,
      ct.date_upd           AS dateUpd,
      COALESCE(NULLIF(TRIM(CONCAT(c.firstname, ' ', c.lastname)), ''), ct.email) AS customerName,
      o.reference           AS orderReference
    FROM ps_customer_thread ct
    LEFT JOIN ps_customer c ON c.id_customer = ct.id_customer
    LEFT JOIN ps_orders o ON o.id_order = ct.id_order
    WHERE ct.id_customer_thread = ?
  `, [threadId])

  if (!thread) throw createError({ statusCode: 404, message: 'Ticket introuvable' })

  // Timeline complète — ASC pour construire un fil de discussion naturel.
  // `fromEmployee` : si id_employee est renseigné, c'est une réponse
  // équipe. Les messages venant du client via le formulaire de contact
  // ont id_employee = NULL (ou 0 selon les versions PS).
  const messages = await db.query<any>(`
    SELECT
      cm.id_customer_message AS id,
      cm.id_customer_thread  AS threadId,
      cm.id_employee         AS employeeId,
      cm.message,
      cm.file_name           AS fileName,
      cm.private,
      cm.read,
      cm.date_add            AS dateAdd,
      cm.date_upd            AS dateUpd,
      CASE WHEN cm.id_employee IS NOT NULL AND cm.id_employee > 0 THEN 1 ELSE 0 END AS fromEmployee,
      COALESCE(e.firstname, '')  AS employeeFirstname,
      COALESCE(e.lastname, '')   AS employeeLastname
    FROM ps_customer_message cm
    LEFT JOIN ps_employee e ON e.id_employee = cm.id_employee
    WHERE cm.id_customer_thread = ?
    ORDER BY cm.date_add ASC, cm.id_customer_message ASC
  `, [threadId])

  // Contexte client — nullable (tickets depuis formulaire contact public
  // sans compte).
  let customer: any = null
  if (thread.customerId) {
    customer = await db.get<any>(`
      SELECT
        c.id_customer  AS id,
        c.firstname, c.lastname, c.email, c.company, c.siret,
        c.active,
        c.id_default_group AS defaultGroupId,
        c.date_add     AS dateAdd,
        (SELECT COUNT(*) FROM ps_orders o WHERE o.id_customer = c.id_customer AND o.valid = 1) AS nbOrders,
        (SELECT COALESCE(ROUND(SUM(o.total_paid_tax_incl), 2), 0) FROM ps_orders o WHERE o.id_customer = c.id_customer AND o.valid = 1) AS totalSpent
      FROM ps_customer c
      WHERE c.id_customer = ? AND c.deleted = 0
    `, [thread.customerId])
  }

  // Commande liée — simplifiée (assez pour le panneau contexte).
  let order: any = null
  if (thread.orderId) {
    order = await db.get<any>(`
      SELECT
        o.id_order       AS id,
        o.reference,
        o.current_state  AS statusId,
        o.payment,
        ROUND(o.total_paid_tax_incl, 2) AS totalPaidTTC,
        o.date_add       AS dateAdd,
        COALESCE(osl.name, '') AS statusName
      FROM ps_orders o
      LEFT JOIN ps_order_state_lang osl ON osl.id_order_state = o.current_state AND osl.id_lang = ?
      WHERE o.id_order = ?
    `, [Number(thread.langId) || 1, thread.orderId])
  }

  return { thread, customer, order, messages }
})
