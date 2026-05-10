/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

/**
 * POST /api/bo/appointment/availability/bulk
 *
 * Body :
 *   dateFrom            : ISO date "2026-05-07"
 *   dateTo              : ISO date "2027-05-07"
 * hourStart           : 6   (hour of first slot, 0-23)
 * hourEnd             : 13  (exclusive hour of first slot, 0-23 — appointment must
 * end at the latest at hourEnd)
 * slotMinutes         : 30  (duration + interval)
 *   daysOfWeek          : [1,2,3,4,5]  (1=lun … 7=dim, ISO)
 *   excludeFrenchHolidays : true
 *
 * Generates slots server-side via generate_series, NOT EXISTS to
 * avoid duplicates on (date_start). Returns the count created.
 */

// 11 fériés FR sur 5 ans glissants — calculés ici plutôt qu'une lib pour
// éviter une dépendance npm sur si peu de logique.
function frenchHolidays(yearStart: number, yearEnd: number): string[] {
  const out: string[] = []
  for (let y = yearStart; y <= yearEnd; y++) {
    out.push(
      `${y}-01-01`, // Jour de l'An
      `${y}-05-01`, // Fête du Travail
      `${y}-05-08`, // Victoire 1945
      `${y}-07-14`, // Fête nationale
      `${y}-08-15`, // Assomption
      `${y}-11-01`, // Toussaint
      `${y}-11-11`, // Armistice
      `${y}-12-25`, // Noël
    )
    // Pâques (algo de Gauss / Butcher) → lundi de Pâques + Ascension + Pentecôte
    const a = y % 19
    const b = Math.floor(y / 100)
    const c = y % 100
    const dG = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - dG - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const month = Math.floor((h + l - 7 * m + 114) / 31)
    const day = ((h + l - 7 * m + 114) % 31) + 1
    const easter = new Date(Date.UTC(y, month - 1, day))
    const addDays = (base: Date, n: number) => {
      const d = new Date(base.getTime() + n * 86400000)
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    }
    out.push(addDays(easter, 1))  // Lundi de Pâques
    out.push(addDays(easter, 39)) // Ascension
    out.push(addDays(easter, 50)) // Lundi de Pentecôte
  }
  return out
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const dateFrom = String(body?.dateFrom ?? '').trim()
  const dateTo = String(body?.dateTo ?? '').trim()
  const hourStart = Math.max(0, Math.min(23, Number(body?.hourStart ?? 9)))
  const hourEnd = Math.max(hourStart + 1, Math.min(24, Number(body?.hourEnd ?? 18)))
  const slotMinutes = Math.max(5, Math.min(240, Number(body?.slotMinutes ?? 30)))
  const dowRaw = Array.isArray(body?.daysOfWeek) ? body.daysOfWeek : [1, 2, 3, 4, 5]
  const daysOfWeek = dowRaw
    .map((n: any) => Number(n))
    .filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 7)
  const excludeHolidays = !!body?.excludeFrenchHolidays

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    throw createError({ statusCode: 422, statusMessage: 'dateFrom/dateTo invalides (YYYY-MM-DD)' })
  }
  if (dateFrom > dateTo) {
    throw createError({ statusCode: 422, statusMessage: 'dateFrom doit précéder dateTo' })
  }
  if (!daysOfWeek.length) {
    throw createError({ statusCode: 422, statusMessage: 'daysOfWeek vide' })
  }

  const yFrom = Number(dateFrom.slice(0, 4))
  const yTo = Number(dateTo.slice(0, 4))
  const holidays = excludeHolidays ? frenchHolidays(yFrom, yTo) : []

  const d = usePocPg()
  // PG DOW : Sunday=0, Monday=1 … Saturday=6. ISO : Lundi=1 … Dimanche=7.
  // On convertit notre liste ISO en PG DOW (Dimanche ISO 7 → PG 0).
  const pgDow = daysOfWeek.map((iso: number) => (iso === 7 ? 0 : iso))
  const pgDowList = sql.join(pgDow.map(n => sql`${n}`), sql`, `)
  const holidayList = holidays.length
    ? sql.join(holidays.map(h => sql`${h}::date`), sql`, `)
    : sql`NULL::date`

  // Génère TOUS les pas de slotMinutes sur la période, puis filtre :
  //   - DOW dans la liste autorisée
  //   - heure entre hourStart et hourEnd (le dernier slot doit FINIR au plus
  //     tard à hourEnd → start ≤ hourEnd - slotMinutes)
  //   - jour pas férié si excludeHolidays
  //   - pas déjà inséré (NOT EXISTS sur date_start, pas d'unique constraint)
  const result = await d.execute<any>(sql`
    INSERT INTO cs_main.cs_appointment_availability
        (date_start, duration_min, is_booked, notes)
    SELECT slot_ts, ${slotMinutes}, 0, NULL
      FROM generate_series(
            (${dateFrom}::date + (${hourStart}::int * interval '1 hour'))::timestamp,
            (${dateTo}::date   + (${hourEnd  }::int * interval '1 hour'))::timestamp,
            (${slotMinutes}::int * interval '1 minute')
          ) AS slot_ts
     WHERE EXTRACT(DOW FROM slot_ts) IN (${pgDowList})
       AND (
         EXTRACT(HOUR FROM slot_ts) * 60 + EXTRACT(MINUTE FROM slot_ts)
       ) BETWEEN ${hourStart}::int * 60 AND ${hourEnd}::int * 60 - ${slotMinutes}::int
       ${excludeHolidays
         ? sql`AND slot_ts::date NOT IN (${holidayList})`
         : sql``}
       AND NOT EXISTS (
         SELECT 1 FROM cs_main.cs_appointment_availability av
          WHERE av.date_start = slot_ts
       )
    RETURNING id_availability
  `)
  const inserted = ((result as any) as any[]).length

  return { success: true, inserted }
})
