/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { isValidActivityCode } from '~/utils/customerActivity'

/**
 * PUT /api/bo/customers/:id — customer record editing.
 *
 * Touche trois zones :
 * 1. ps_customer        : identity + flags + siret + company
 *   2. ps_address         : adresse facturation principale (company,
 * vat_number). Update the first
 * active customer address (PS pattern
 * standard) ; create if the customer doesn't yet
 * have an address (CSV import case).
 * 3. ps_customer_group  : reset + insert B2B groups. The
 * id_default_group is forced in the set
 * to respect the PS constraint (a customer
 * MUST belong to their default group).
 *
 * No multilang — ps_customer has no localized columns.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })
  const customerId = Number(id)
  if (!Number.isFinite(customerId) || customerId <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }

  const body = await readBody<Record<string, any>>(event)
  const db = useClientDb(event)

  const exists = await db.get<any>(`SELECT id_customer, id_default_group FROM ps_customer WHERE id_customer = ? AND deleted = 0`, [customerId])
  if (!exists) throw createError({ statusCode: 404, message: 'Client introuvable' })

  const stats = { customerUpdated: false, addressUpdated: false, addressCreated: false, groupsSet: 0, activityUpdated: false }

  // ─── 1. ps_customer ──────────────────────────────────────────────
  const cf: string[] = []
  const cp: any[] = []
  if (body.firstname !== undefined) { cf.push('firstname = ?'); cp.push(String(body.firstname || '').trim()) }
  if (body.lastname !== undefined) { cf.push('lastname = ?'); cp.push(String(body.lastname || '').trim()) }
  if (body.email !== undefined) { cf.push('email = ?'); cp.push(String(body.email || '').trim()) }
  if (body.company !== undefined) { cf.push('company = ?'); cp.push(String(body.company || '')) }
  if (body.siret !== undefined) { cf.push('siret = ?'); cp.push(String(body.siret || '')) }
  if (body.active !== undefined) { cf.push('active = ?'); cp.push(body.active ? 1 : 0) }
  if (body.newsletter !== undefined) { cf.push('newsletter = ?'); cp.push(body.newsletter ? 1 : 0) }
  if (body.optin !== undefined) { cf.push('optin = ?'); cp.push(body.optin ? 1 : 0) }
  if (body.note !== undefined) { cf.push('note = ?'); cp.push(String(body.note || '')) }
  if (body.defaultGroupId !== undefined) { cf.push('id_default_group = ?'); cp.push(Number(body.defaultGroupId) || 3) }

  if (cf.length) {
    cf.push('date_upd = NOW()')
    await db.run(`UPDATE ps_customer SET ${cf.join(', ')} WHERE id_customer = ?`, [...cp, customerId])
    stats.customerUpdated = true
  }

  // ─── 2. ps_address — adresse facturation principale ──────────────
  // Champs pilotés par le Bloc Profil B2B de la fiche : company,
  // vat_number. Pas de mutation des autres colonnes (address1, ville…)
  // depuis cet endpoint — elles ont leur propre éditeur d'adresses
  const hasAddrFields = body.company !== undefined || body.vatNumber !== undefined
  if (hasAddrFields) {
    const existing = await db.get<any>(`
      SELECT id_address FROM ps_address
      WHERE id_customer = ? AND deleted = 0 AND active = 1
      ORDER BY id_address DESC LIMIT 1
    `, [customerId])

    if (existing) {
      const af: string[] = []
      const ap: any[] = []
      if (body.company !== undefined) { af.push('company = ?'); ap.push(String(body.company || '')) }
      if (body.vatNumber !== undefined) { af.push('vat_number = ?'); ap.push(String(body.vatNumber || '')) }
      if (af.length) {
        af.push('date_upd = NOW()')
        await db.run(`UPDATE ps_address SET ${af.join(', ')} WHERE id_address = ?`, [...ap, existing.id_address])
        stats.addressUpdated = true
      }
    } else if (body.company || body.vatNumber) {
      // Aucune adresse encore — on seed une adresse minimale pour
      // porter company/vat_number. Les colonnes NOT NULL sont
      // complétera plus tard côté PS BO. alias='Facturation' pour
      // distinguer des adresses normales.
      await db.run(`
        INSERT INTO ps_address
          (id_country, id_state, id_customer, id_manufacturer, id_supplier, id_warehouse,
           alias, company, lastname, firstname, address1, postcode, city,
           phone, vat_number, date_add, date_upd, active, deleted)
        VALUES (?, 0, ?, 0, 0, 0, 'Facturation', ?, ?, ?, '—', '00000', '—', '', ?, NOW(), NOW(), 1, 0)
      `, [
        Number(body.countryId) || 8, // 8 = France par défaut PS
        customerId,
        String(body.company || ''),
        String(body.lastname || exists.id_customer || '—'),
        String(body.firstname || '—'),
        String(body.vatNumber || ''),
      ])
      stats.addressCreated = true
    }
  }

  // ─── 3. ps_customer_group ────────────────────────────────────────
  // Reset complet puis insert. On force l'inclusion du
  // id_default_group pour respecter la contrainte PS native (le
  // groupe par défaut DOIT appartenir au set — sinon Customer::isUsed
  // et le tarif B2B plantent).
  if (Array.isArray(body.groupIds)) {
    const defaultGroup = Number(body.defaultGroupId) || Number(exists.id_default_group) || 3
    const set = new Set<number>(
      body.groupIds.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
    )
    set.add(defaultGroup)

    // ps_customer_group a une PK composite (id_customer, id_group) — pas de
    // colonne id_customer_group. db.run() ajoute heuristiquement RETURNING
    // id_customer_group et fait planter PG (cf feedback_db_run_returning_short_pks).
    // db.query suffit ici, on n'a pas besoin de l'insertId.
    await db.query(`DELETE FROM ps_customer_group WHERE id_customer = ?`, [customerId])
    for (const gid of set) {
      await db.query(
        `INSERT INTO ps_customer_group (id_customer, id_group) VALUES (?, ?)`,
        [customerId, gid]
      )
      stats.groupsSet++
    }
  }

  // ─── 4. Profil B2B étendu (cs_customer_extra) ─────────────────
  // Source de vérité unique — UPSERT sur id_customer via la façade Drizzle.
  // Les codes sont sémantiques (gms, chr, grossiste, …) et validés côté serveur.
  // Si la table n'existe pas (module ac_customerextra non installé),
  // on remonte une 501 explicite : mieux que silent-fail sur un write.
  if (body.activityCode !== undefined) {
    const raw = body.activityCode === null || body.activityCode === '' ? null : String(body.activityCode)
    if (raw !== null && !isValidActivityCode(raw)) {
      throw createError({ statusCode: 400, message: 'Code activité invalide' })
    }
    const { upsertCustomerActivityCode, deleteCustomerExtra } = await import('~/modules/customer-extra/server/utils/customer-extra')
    try {
      if (raw === null) {
        await deleteCustomerExtra(customerId, { event })
      } else {
        await upsertCustomerActivityCode(customerId, raw, { event })
      }
      stats.activityUpdated = true
    } catch (err: any) {
      if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
        throw createError({
          statusCode: 501,
          message: 'Module ac_customerextra non installé sur ce tenant — impossible d\'écrire l\'activité.',
        })
      }
      console.warn('[customers/:id] ac_customer_extra write error:', err?.message)
      throw createError({ statusCode: 500, message: 'Échec écriture activité' })
    }
  }

  return { success: true, id: customerId, stats }
})
