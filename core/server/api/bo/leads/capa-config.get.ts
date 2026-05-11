

import { useClientDb } from '~/server/utils/db'

const DEFAULTS = {
  ticketAnnuelEur: 10000,
  caConfortableMin: 5_000_000,
  caFaisableMin: 1_000_000,
  lossRatioMax: 0.10,
  label: '',
}

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  try {
    const row = await db.get<any>(
      `SELECT id_shop, label, ticket_annuel_eur AS "ticketAnnuelEur",
              ca_confortable_min AS "caConfortableMin",
              ca_faisable_min AS "caFaisableMin",
              loss_ratio_max AS "lossRatioMax"
         FROM cs_capa_config
        WHERE id_shop = 1
        LIMIT 1`,
      [],
    )
    if (!row) return { config: DEFAULTS, exists: false }
    return {
      config: {
        label: row.label ?? '',
        ticketAnnuelEur: Number(row.ticketAnnuelEur),
        caConfortableMin: Number(row.caConfortableMin),
        caFaisableMin: Number(row.caFaisableMin),
        lossRatioMax: Number(row.lossRatioMax),
      },
      exists: true,
    }
  } catch (err: any) {
    console.error('[bo/leads/capa-config] DB error:', err?.message)
    return { config: DEFAULTS, exists: false }
  }
})
