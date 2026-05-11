

import { useClientDb } from '~/server/utils/db'

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
        
        const res = await db.run(
          `UPDATE ps_customer SET deleted = 1, date_upd = NOW() WHERE id_customer IN (${ph}) AND deleted = 0`,
          customerIds,
        )
        deletedCustomer = Number(res?.affectedRows || 0)
      } else {
        
        
        
        
        await db.run(
          `DELETE FROM ps_address WHERE id_customer IN (${ph})
             AND id_address NOT IN (
               SELECT id_address_invoice  FROM ps_orders WHERE id_customer IN (${ph})
               UNION
               SELECT id_address_delivery FROM ps_orders WHERE id_customer IN (${ph})
             )`,
          [...customerIds, ...customerIds, ...customerIds],
        )
        
        await db.run(
          `DELETE FROM ps_cart WHERE id_customer IN (${ph})
             AND id_cart NOT IN (SELECT id_cart FROM ps_orders WHERE id_customer IN (${ph}))`,
          [...customerIds, ...customerIds],
        )
        
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
