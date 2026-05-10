/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * POST /api/bo/leads/bulk-delete — suppression en lot depuis /hub/leads.
 *
 * Body: {
 *   items: [{ source: 'lead'|'contact'|'customer-noorder', id: number }, ...],
 * mode?: 'soft' | 'hard'   // default 'soft' for customer-noorder
 * }
 *
 * - `lead` (cs_smartlead) : DELETE direct, FK rungis cascadent.
 * - `contact` (cs_headlesscontact_message) : DELETE direct.
 * - `customer-noorder` (ps_customer natif) :
 *     * mode='soft' (default) : UPDATE ps_customer SET deleted=1 — l'email
 * becomes free for re-registration (register.post.ts checks
 * `WHERE email=? AND deleted=0`). Preserves related orders
 * (ps_orders.id_customer points to a deleted=1 row but readable).
 *     * mode='hard' : DELETE FROM ps_customer + nettoyage satellites
 * (ps_address NOT linked to orders, non-ordered ps_cart,
 *       ps_customer_group, ps_customer_thread, ps_guest, ps_connections).
 * PRESERVE the orders: ps_orders.id_customer becomes orphaned
 * but the identity remains copied in ps_orders.* + ps_address of the
 * order (native PS pattern: address snapshot at order time).
 *
 * Retour : { deleted: { lead, contact, customer }, mode }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    items?: Array<{ source: string; id: number | string }>
    mode?:  'soft' | 'hard'
  }
  const items = Array.isArray(body?.items) ? body.items : []
  if (!items.length) {
    throw createError({ statusCode: 400, statusMessage: 'items array required' })
  }
  const mode: 'soft' | 'hard' = body?.mode === 'hard' ? 'hard' : 'soft'

  const leadIds: number[] = []
  const contactIds: number[] = []
  const customerIds: number[] = []

  for (const it of items) {
    const id = Number(it?.id)
    if (!Number.isFinite(id) || id <= 0) continue
    if (it.source === 'lead') leadIds.push(id)
    else if (it.source === 'contact') contactIds.push(id)
    else if (it.source === 'customer-noorder') customerIds.push(id)
  }

  const db = useClientDb(event)
  let deletedLead = 0
  let deletedContact = 0
  let deletedCustomer = 0

  try {
    if (leadIds.length) {
      const placeholders = leadIds.map(() => '?').join(',')
      const res = await db.run(
        `DELETE FROM cs_main.cs_smartlead WHERE id_ac_smartlead IN (${placeholders})`,
        leadIds,
      )
      deletedLead = Number(res?.affectedRows || 0)
    }
    if (contactIds.length) {
      const placeholders = contactIds.map(() => '?').join(',')
      const res = await db.run(
        `DELETE FROM cs_main.cs_headlesscontact_message WHERE id_message IN (${placeholders})`,
        contactIds,
      )
      deletedContact = Number(res?.affectedRows || 0)
    }
    if (customerIds.length) {
      const ph = customerIds.map(() => '?').join(',')

      if (mode === 'soft') {
        // Soft delete PS natif : libère l'email pour ré-inscription.
        const res = await db.run(
          `UPDATE ps_customer SET deleted = 1, date_upd = NOW() WHERE id_customer IN (${ph}) AND deleted = 0`,
          customerIds,
        )
        deletedCustomer = Number(res?.affectedRows || 0)
      } else {
        // Hard delete RGPD-style : on retire toute trace SAUF les commandes.
        // Adresses non utilisées par une commande → DELETE. Adresses snapshotées
        // dans ps_orders (id_address_invoice, id_address_delivery) → conservées
        // pour audit/compta.
        await db.run(
          `DELETE FROM ps_address WHERE id_customer IN (${ph})
             AND id_address NOT IN (
               SELECT id_address_invoice  FROM ps_orders WHERE id_customer IN (${ph})
               UNION
               SELECT id_address_delivery FROM ps_orders WHERE id_customer IN (${ph})
             )`,
          [...customerIds, ...customerIds, ...customerIds],
        )
        // Carts non transformés en commande
        await db.run(
          `DELETE FROM ps_cart WHERE id_customer IN (${ph})
             AND id_cart NOT IN (SELECT id_cart FROM ps_orders WHERE id_customer IN (${ph}))`,
          [...customerIds, ...customerIds],
        )
        // Tables satellites tolérantes (graceful si absentes / vides)
        for (const sql of [
          `DELETE FROM ps_customer_group WHERE id_customer IN (${ph})`,
          `DELETE FROM ps_customer_thread WHERE id_customer IN (${ph})`,
          `DELETE FROM ps_connections WHERE id_guest IN (SELECT id_guest FROM ps_guest WHERE id_customer IN (${ph}))`,
          `DELETE FROM ps_guest WHERE id_customer IN (${ph})`,
        ]) {
          try {
            await db.run(sql, customerIds)
          } catch (e: any) {
            console.warn(`[bulk-delete:hard] satellite skip:`, e?.message?.slice(0, 120))
          }
        }
        // ps_customer en dernier — ps_orders.id_customer reste mais orphelin
        // (PS n'a pas de FK CASCADE sur cette colonne — vérifié runtime).
        const res = await db.run(
          `DELETE FROM ps_customer WHERE id_customer IN (${ph})`,
          customerIds,
        )
        deletedCustomer = Number(res?.affectedRows || 0)
      }
    }
  } catch (err: any) {
    console.error('[bo/leads/bulk-delete] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  }

  return {
    ok: true,
    mode,
    deleted: { lead: deletedLead, contact: deletedContact, customer: deletedCustomer },
  }
})
