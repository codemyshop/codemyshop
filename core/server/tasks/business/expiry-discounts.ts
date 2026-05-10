/**
 *
 * Nitro Task — business:expiry-discounts
 *
 * Wave 4F of task #43. Port of `synedre/ac_cron_expiry_discounts.py`
 * (cron 03:35 UTC). Synchronizes expiry discounts in `ps_specific_price`
 * for active lots (`cs_lot`, qty_remaining > 0, expiry 0-14d).
 *
 * Algorithme :
 * 1. Scan eligible lots with MAX(discount_pct) via cs_expiry_rule
 * 2. Upsert: INSERT ps_specific_price + INSERT cs_expiry_applied if not
 * existing, UPDATE if pct changes, no-op if pct is identical
 * 3. Cleanup: for each active cs_expiry_applied whose lot is no longer
 * eligible, DELETE ps_specific_price + UPDATE removed_at = NOW()
 *
 * Idempotent: successive runs produce the same final state.
 *
 * AUDIT_MODE :
 * - 'shadow' (default): preview only, NO writes — equivalent to a dry-run of the
 * Python. The Python cron continues with --apply.
 *  - 'active'           : applique. Cutover = AUDIT_MODE_AC_CRON_EXPIRY_DISCOUNTS=
 * active + disable the Python cron.
 */

import { defineTask } from 'nitropack/runtime'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { getAuditMode } from '~/server/utils/audit-mode'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_cron_expiry_discounts'

type EligibleLot = {
  id_lot: number
  id_product: number
  id_product_attribute: number
  expiry_date: string
  pct: number | null
}

type AppliedRow = {
  id_applied: number
  id_lot: number
  id_specific_price: number
  discount_pct: string
}

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return rows[0]?.exists ?? false
}

async function fetchEligibleLots(): Promise<EligibleLot[]> {
  const sql = getPgClient()
  return await sql<EligibleLot[]>`
    SELECT l.id_lot, l.id_product, l.id_product_attribute,
           l.expiry_date::text AS expiry_date,
           (SELECT MAX(r.discount_pct)
              FROM ${sql(PG_SCHEMA)}.cs_expiry_rule r
              WHERE r.active = 1
                AND (l.expiry_date - CURRENT_DATE) BETWEEN r.min_days AND r.max_days
           )::float AS pct
    FROM ${sql(PG_SCHEMA)}.cs_lot l
    WHERE l.active = 1
      AND l.expiry_date IS NOT NULL
      AND l.quantity_remaining > 0
      AND (l.expiry_date - CURRENT_DATE) BETWEEN 0 AND 14
  `
}

async function findActiveAppliedByLot(idLot: number): Promise<AppliedRow | null> {
  const sql = getPgClient()
  const rows = await sql<AppliedRow[]>`
    SELECT id_applied, id_lot, id_specific_price, discount_pct
    FROM ${sql(PG_SCHEMA)}.cs_expiry_applied
    WHERE id_lot = ${idLot} AND removed_at IS NULL
    LIMIT 1
  `
  return rows[0] ?? null
}

async function fetchAllActiveApplied(): Promise<Pick<AppliedRow, 'id_applied' | 'id_lot' | 'id_specific_price'>[]> {
  const sql = getPgClient()
  return await sql<Pick<AppliedRow, 'id_applied' | 'id_lot' | 'id_specific_price'>[]>`
    SELECT id_applied, id_lot, id_specific_price
    FROM ${sql(PG_SCHEMA)}.cs_expiry_applied
    WHERE removed_at IS NULL
  `
}

async function insertSpecificPrice(
  idProduct: number,
  idPa: number,
  pct: number,
  expiryDate: string,
): Promise<number> {
  const sql = getPgClient()
  const rows = await sql<{ id_specific_price: number }[]>`
    INSERT INTO ps_specific_price
      (id_specific_price_rule, id_cart, id_product, id_shop, id_shop_group,
       id_currency, id_country, id_group, id_customer, id_product_attribute,
       price, from_quantity, reduction, reduction_tax, reduction_type,
       "from", "to")
    VALUES (0, 0, ${idProduct}, 1, 0, 0, 0, 0, 0, ${idPa},
            -1, 1, ${pct / 100}, 1, 'percentage',
            NOW(), ${`${expiryDate} 23:59:59`})
    RETURNING id_specific_price
  `
  return rows[0]!.id_specific_price
}

async function insertExpiryApplied(idLot: number, idSp: number, pct: number): Promise<void> {
  const sql = getPgClient()
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_expiry_applied
      (id_lot, id_specific_price, discount_pct, applied_at)
    VALUES (${idLot}, ${idSp}, ${pct}, NOW())
  `
}

async function updateSpecificPriceReduction(idSp: number, pct: number): Promise<void> {
  const sql = getPgClient()
  await sql`UPDATE ps_specific_price SET reduction = ${pct / 100} WHERE id_specific_price = ${idSp}`
}

async function updateAppliedPct(idApplied: number, pct: number): Promise<void> {
  const sql = getPgClient()
  await sql`
    UPDATE ${sql(PG_SCHEMA)}.cs_expiry_applied
    SET discount_pct = ${pct} WHERE id_applied = ${idApplied}
  `
}

async function deleteSpecificPrice(idSp: number): Promise<void> {
  const sql = getPgClient()
  await sql`DELETE FROM ps_specific_price WHERE id_specific_price = ${idSp}`
}

async function markAppliedRemoved(idApplied: number): Promise<void> {
  const sql = getPgClient()
  await sql`
    UPDATE ${sql(PG_SCHEMA)}.cs_expiry_applied
    SET removed_at = NOW() WHERE id_applied = ${idApplied}
  `
}

async function syncExpiryDiscounts(active: boolean) {
  const stats = { created: 0, updated: 0, removed: 0, unchanged: 0, skipped_no_pct: 0 }
  const eligibleLotIds = new Set<number>()

  const lots = await fetchEligibleLots()
  for (const lot of lots) {
    if (lot.pct == null) {
      stats.skipped_no_pct++
      continue
    }
    eligibleLotIds.add(lot.id_lot)
    const existing = await findActiveAppliedByLot(lot.id_lot)
    if (!existing) {
      if (!active) {
        stats.created++
        continue
      }
      const idSp = await insertSpecificPrice(lot.id_product, lot.id_product_attribute, lot.pct, lot.expiry_date)
      await insertExpiryApplied(lot.id_lot, idSp, lot.pct)
      stats.created++
    } else {
      const currentPct = parseFloat(existing.discount_pct)
      if (Math.abs(currentPct - lot.pct) < 0.01) {
        stats.unchanged++
      } else {
        if (!active) {
          stats.updated++
          continue
        }
        await updateSpecificPriceReduction(existing.id_specific_price, lot.pct)
        await updateAppliedPct(existing.id_applied, lot.pct)
        stats.updated++
      }
    }
  }

  const allApplied = await fetchAllActiveApplied()
  for (const a of allApplied) {
    if (eligibleLotIds.has(a.id_lot)) continue
    if (!active) {
      stats.removed++
      continue
    }
    await deleteSpecificPrice(a.id_specific_price)
    await markAppliedRemoved(a.id_applied)
    stats.removed++
  }

  return { stats, eligibleCount: lots.length, totalApplied: allApplied.length }
}

export default defineTask({
  meta: {
    name: 'business:expiry-discounts',
    description: 'Sync décotes DLC ps_specific_price (port ac_cron_expiry_discounts, Wave 4F)',
  },
  async run() {
    const skip = skipIfNotAcInternal('business:expiry-discounts')
    if (skip) return skip
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const mode = getAuditMode(AUTOMATE_KEY)
        const active = mode === 'active'
        const { stats, eligibleCount } = await syncExpiryDiscounts(active)

        log.count('eligible_lots', eligibleCount)
        log.count('created', stats.created)
        log.count('updated', stats.updated)
        log.count('removed', stats.removed)
        log.count('unchanged', stats.unchanged)
        log.count('skipped_no_pct', stats.skipped_no_pct)

        const summary = `${active ? 'apply' : '[shadow]'} eligible=${eligibleCount} created=${stats.created} updated=${stats.updated} removed=${stats.removed} unchanged=${stats.unchanged}`
        const status = 'ok'
        log.setResult(status, summary)

        return { status, mode, stats, eligibleCount, summary }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
