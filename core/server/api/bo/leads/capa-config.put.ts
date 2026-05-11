

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Record<string, any>

  const ticketAnnuelEur = Math.max(0, Math.min(10_000_000, Math.trunc(Number(body.ticketAnnuelEur ?? 10000))))
  const caConfortableMin = Math.max(0, Number(body.caConfortableMin ?? 5_000_000))
  const caFaisableMin = Math.max(0, Number(body.caFaisableMin ?? 1_000_000))
  const lossRatioMax = Math.max(0, Math.min(1, Number(body.lossRatioMax ?? 0.10)))
  const label = typeof body.label === 'string' ? body.label.slice(0, 64) : ''

  
  if (caConfortableMin < caFaisableMin) {
    throw createError({
      statusCode: 400,
      statusMessage: 'caConfortableMin doit être >= caFaisableMin',
    })
  }

  const db = useClientDb(event)
  try {
    await db.query(
      `INSERT INTO cs_capa_config
         (id_shop, label, ticket_annuel_eur, ca_confortable_min, ca_faisable_min, loss_ratio_max, date_add, date_upd)
       VALUES (1, ?, ?, ?, ?, ?, NOW(), NOW())
       ON CONFLICT (id_shop) DO UPDATE SET
         label = EXCLUDED.label,
         ticket_annuel_eur = EXCLUDED.ticket_annuel_eur,
         ca_confortable_min = EXCLUDED.ca_confortable_min,
         ca_faisable_min = EXCLUDED.ca_faisable_min,
         loss_ratio_max = EXCLUDED.loss_ratio_max,
         date_upd = NOW()`,
      [label, ticketAnnuelEur, caConfortableMin, caFaisableMin, lossRatioMax],
    )
    return {
      ok: true,
      config: { label, ticketAnnuelEur, caConfortableMin, caFaisableMin, lossRatioMax },
    }
  } catch (err: any) {
    console.error('[bo/leads/capa-config PUT] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  }
})
