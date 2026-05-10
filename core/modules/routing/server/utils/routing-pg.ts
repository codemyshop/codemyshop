/**
 *
 * Routing facade (PostgreSQL-backed) — Phase 1 step 8,
 * flag PG_ENABLED_DOMAINS=routing.
 *
 * Mirror of the functions from `./routing.ts` but routed to the postgres backend
 * (schema cs_main). Inclut writes (createTour/updateTour/deleteTour,
 * addStopToTour/updateStop/deleteStop, optimizeTour) — second cluster with
 * write path after bank processing.
 *
 * The tables `routing_vehicle` / `routing_driver` were snapshotted as
 * read-only at step 7 — used in JOINs for `listTours` /
 * `getTourWithStops` / `listVehicles` / `listDrivers`. No writes go
 * to them on the Nuxt side (see inventory bucket A step 7).
 *
 * Conversions notables MySQL -> PG :
 *   - DATE_FORMAT(d, '%Y-%m-%d') -> to_char(d, 'YYYY-MM-DD')
 * - DATE_FORMAT(t, '%H:%i')    -> in PostgreSQL the time field is stored as
 *                                   VARCHAR(8) (cf. schema-pg/routing-tour),
 * we return the first 5 characters HH:MM.
 *   - CONCAT_WS(' ', a, b)       -> identique en PG.
 *   - NOW()                      -> CURRENT_TIMESTAMP (alias direct).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'
import type {
  TourStatus,
  StopStatus,
  VehicleRow,
  DriverRow,
  TourSummary,
  TourDetail,
  StopRow,
  CreateTourInput,
  UpdateTourInput,
  AddStopInput,
  UpdateStopInput,
  OptimizeResult,
} from './routing'

// ──────────────────────────────────────────────────────────────
// Vehicles & Drivers (lecture only, schema cs_main)
// ──────────────────────────────────────────────────────────────

export async function listVehiclesPg(): Promise<VehicleRow[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT
      id_vehicle       AS id,
      label,
      plate,
      capacity_kg      AS "capacityKg",
      capacity_pallets AS "capacityPallets",
      refrigerated,
      active
    FROM cs_main.cs_routing_vehicle
    WHERE active = 1
    ORDER BY label ASC
  `)
  const rows = (result as any) as any[]
  return rows.map((r) => ({
    id: Number(r.id),
    label: r.label,
    plate: r.plate,
    capacityKg: Number(r.capacityKg),
    capacityPallets: Number(r.capacityPallets),
    refrigerated: Number(r.refrigerated),
    active: Number(r.active),
  }))
}

export async function listDriversPg(): Promise<DriverRow[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT
      id_driver    AS id,
      first_name   AS "firstName",
      last_name    AS "lastName",
      CONCAT_WS(' ', first_name, last_name) AS "fullName",
      phone,
      license_type AS "licenseType",
      active
    FROM cs_main.cs_routing_driver
    WHERE active = 1
    ORDER BY last_name ASC, first_name ASC
  `)
  const rows = (result as any) as any[]
  return rows.map((r) => ({
    id: Number(r.id),
    firstName: r.firstName,
    lastName: r.lastName,
    fullName: r.fullName,
    phone: r.phone,
    licenseType: r.licenseType,
    active: Number(r.active),
  }))
}

// ──────────────────────────────────────────────────────────────
// Tours
// ──────────────────────────────────────────────────────────────

export async function listToursPg(filterDate: string | null): Promise<TourSummary[]> {
  const dateClause = filterDate ? sql` WHERE t.tour_date = ${filterDate}` : sql``
  const result = await usePocPg().execute<any>(sql`
    SELECT
      t.id_tour                                    AS id,
      t.label,
      to_char(t.tour_date, 'YYYY-MM-DD')           AS "tourDate",
      t.id_vehicle                                 AS "idVehicle",
      v.label                                      AS "vehicleLabel",
      v.plate                                      AS "vehiclePlate",
      t.id_driver                                  AS "idDriver",
      CONCAT_WS(' ', d.first_name, d.last_name)    AS "driverName",
      t.depot_lat                                  AS "depotLat",
      t.depot_lng                                  AS "depotLng",
      t.status,
      t.optimized_at                               AS "optimizedAt",
      t.total_km                                   AS "totalKm",
      (SELECT COUNT(*)
         FROM cs_main.cs_routing_tour_stop s
        WHERE s.id_tour = t.id_tour)               AS "stopCount",
      (SELECT COALESCE(SUM(s.weight_kg), 0)
         FROM cs_main.cs_routing_tour_stop s
        WHERE s.id_tour = t.id_tour)               AS "totalWeight",
      (SELECT COALESCE(SUM(s.pallets), 0)
         FROM cs_main.cs_routing_tour_stop s
        WHERE s.id_tour = t.id_tour)               AS "totalPallets"
    FROM cs_main.cs_routing_tour t
    LEFT JOIN cs_main.cs_routing_vehicle v ON v.id_vehicle = t.id_vehicle
    LEFT JOIN cs_main.cs_routing_driver  d ON d.id_driver  = t.id_driver
    ${dateClause}
    ORDER BY t.tour_date DESC, t.id_tour ASC
  `)
  const rows = (result as any) as any[]
  return rows.map((r) => ({
    id: Number(r.id),
    label: r.label,
    tourDate: r.tourDate,
    idVehicle: Number(r.idVehicle),
    vehicleLabel: r.vehicleLabel,
    vehiclePlate: r.vehiclePlate,
    idDriver: Number(r.idDriver),
    driverName: r.driverName,
    depotLat: Number(r.depotLat),
    depotLng: Number(r.depotLng),
    status: r.status as TourStatus,
    optimizedAt: r.optimizedAt,
    totalKm: Number(r.totalKm),
    stopCount: Number(r.stopCount),
    totalWeight: Number(r.totalWeight),
    totalPallets: Number(r.totalPallets),
  }))
}

export async function getTourWithStopsPg(
  idTour: number,
): Promise<{ tour: TourDetail; stops: StopRow[] } | null> {
  const tourRes = await usePocPg().execute<any>(sql`
    SELECT
      t.id_tour                                  AS id,
      t.label,
      to_char(t.tour_date, 'YYYY-MM-DD')         AS "tourDate",
      t.id_vehicle                               AS "idVehicle",
      v.label                                    AS "vehicleLabel",
      v.plate                                    AS "vehiclePlate",
      v.capacity_kg                              AS "vehicleCapacityKg",
      v.capacity_pallets                         AS "vehicleCapacityPallets",
      t.id_driver                                AS "idDriver",
      CONCAT_WS(' ', d.first_name, d.last_name)  AS "driverName",
      d.phone                                    AS "driverPhone",
      t.depot_lat                                AS "depotLat",
      t.depot_lng                                AS "depotLng",
      t.status,
      t.optimized_at                             AS "optimizedAt",
      t.total_km                                 AS "totalKm"
    FROM cs_main.cs_routing_tour t
    LEFT JOIN cs_main.cs_routing_vehicle v ON v.id_vehicle = t.id_vehicle
    LEFT JOIN cs_main.cs_routing_driver  d ON d.id_driver  = t.id_driver
    WHERE t.id_tour = ${idTour}
  `)
  const tourRow = ((tourRes as any) as any[])[0]
  if (!tourRow) return null

  const stopsRes = await usePocPg().execute<any>(sql`
    SELECT
      id_stop        AS id,
      position,
      id_order       AS "idOrder",
      id_customer    AS "idCustomer",
      customer_label AS "customerLabel",
      address,
      postcode,
      city,
      lat,
      lng,
      window_start   AS "windowStart",
      window_end     AS "windowEnd",
      weight_kg      AS "weightKg",
      pallets,
      status,
      notes
    FROM cs_main.cs_routing_tour_stop
    WHERE id_tour = ${idTour}
    ORDER BY position ASC, id_stop ASC
  `)
  const stopRows = (stopsRes as any) as any[]

  return {
    tour: {
      id: Number(tourRow.id),
      label: tourRow.label,
      tourDate: tourRow.tourDate,
      idVehicle: Number(tourRow.idVehicle),
      vehicleLabel: tourRow.vehicleLabel,
      vehiclePlate: tourRow.vehiclePlate,
      vehicleCapacityKg: tourRow.vehicleCapacityKg == null ? null : Number(tourRow.vehicleCapacityKg),
      vehicleCapacityPallets:
        tourRow.vehicleCapacityPallets == null ? null : Number(tourRow.vehicleCapacityPallets),
      idDriver: Number(tourRow.idDriver),
      driverName: tourRow.driverName,
      driverPhone: tourRow.driverPhone,
      depotLat: Number(tourRow.depotLat),
      depotLng: Number(tourRow.depotLng),
      status: tourRow.status as TourStatus,
      optimizedAt: tourRow.optimizedAt,
      totalKm: Number(tourRow.totalKm),
    },
    stops: stopRows.map((s) => ({
      id: Number(s.id),
      position: Number(s.position),
      idOrder: Number(s.idOrder),
      idCustomer: Number(s.idCustomer),
      customerLabel: s.customerLabel,
      address: s.address,
      postcode: s.postcode,
      city: s.city,
      lat: Number(s.lat),
      lng: Number(s.lng),
      windowStart: s.windowStart ? String(s.windowStart).slice(0, 5) : null,
      windowEnd: s.windowEnd ? String(s.windowEnd).slice(0, 5) : null,
      weightKg: Number(s.weightKg),
      pallets: Number(s.pallets),
      status: s.status as StopStatus,
      notes: s.notes,
    })),
  }
}

export async function createTourPg(input: CreateTourInput): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_routing_tour
      (label, tour_date, id_vehicle, id_driver, depot_lat, depot_lng, status, date_add, date_upd)
    VALUES (
      ${input.label},
      ${input.tourDate},
      ${input.idVehicle ?? 0},
      ${input.idDriver ?? 0},
      ${input.depotLat ?? 48.8235},
      ${input.depotLng ?? 2.3536},
      'planned',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `)
}

export async function updateTourPg(idTour: number, input: UpdateTourInput): Promise<void> {
  const sets: any[] = []
  if (input.label !== undefined)     sets.push(sql`label = ${input.label}`)
  if (input.tourDate !== undefined)  sets.push(sql`tour_date = ${input.tourDate}`)
  if (input.idVehicle !== undefined) sets.push(sql`id_vehicle = ${input.idVehicle}`)
  if (input.idDriver !== undefined)  sets.push(sql`id_driver = ${input.idDriver}`)
  if (input.depotLat !== undefined)  sets.push(sql`depot_lat = ${input.depotLat}`)
  if (input.depotLng !== undefined)  sets.push(sql`depot_lng = ${input.depotLng}`)
  if (input.status !== undefined)    sets.push(sql`status = ${input.status}`)
  if (!sets.length) return
  sets.push(sql`date_upd = CURRENT_TIMESTAMP`)
  const setClause = sql.join(sets, sql`, `)
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_routing_tour SET ${setClause} WHERE id_tour = ${idTour}
  `)
}

export async function deleteTourPg(idTour: number): Promise<void> {
  const d = usePocPg()
  await d.execute(sql`DELETE FROM cs_main.cs_routing_tour_stop WHERE id_tour = ${idTour}`)
  await d.execute(sql`DELETE FROM cs_main.cs_routing_tour WHERE id_tour = ${idTour}`)
}

// ──────────────────────────────────────────────────────────────
// Stops
// ──────────────────────────────────────────────────────────────

export async function addStopToTourPg(
  idTour: number,
  input: AddStopInput,
): Promise<{ position: number }> {
  const d = usePocPg()
  const posRes = await d.execute<any>(sql`
    SELECT COALESCE(MAX(position), 0) + 1 AS "nextPos"
    FROM cs_main.cs_routing_tour_stop WHERE id_tour = ${idTour}
  `)
  const position = Number(((posRes as any) as any[])[0]?.nextPos || 1)

  await d.execute(sql`
    INSERT INTO cs_main.cs_routing_tour_stop
      (id_tour, position, id_order, id_customer, customer_label, address, postcode, city,
       lat, lng, window_start, window_end, weight_kg, pallets, status, notes, date_add, date_upd)
    VALUES (
      ${idTour},
      ${position},
      ${input.idOrder ?? 0},
      ${input.idCustomer ?? 0},
      ${input.customerLabel},
      ${input.address ?? ''},
      ${input.postcode ?? ''},
      ${input.city ?? ''},
      ${input.lat ?? 0},
      ${input.lng ?? 0},
      ${input.windowStart || null},
      ${input.windowEnd || null},
      ${input.weightKg ?? 0},
      ${input.pallets ?? 0},
      'pending',
      ${input.notes ?? null},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `)
  return { position }
}

export async function updateStopPg(idStop: number, input: UpdateStopInput): Promise<void> {
  const sets: any[] = []
  if (input.status !== undefined)      sets.push(sql`status = ${input.status}`)
  if (input.position !== undefined)    sets.push(sql`position = ${input.position}`)
  if (input.lat !== undefined)         sets.push(sql`lat = ${input.lat}`)
  if (input.lng !== undefined)         sets.push(sql`lng = ${input.lng}`)
  if (input.address !== undefined)     sets.push(sql`address = ${input.address}`)
  if (input.postcode !== undefined)    sets.push(sql`postcode = ${input.postcode}`)
  if (input.city !== undefined)        sets.push(sql`city = ${input.city}`)
  if (input.windowStart !== undefined) sets.push(sql`window_start = ${input.windowStart || null}`)
  if (input.windowEnd !== undefined)   sets.push(sql`window_end = ${input.windowEnd || null}`)
  if (input.weightKg !== undefined)    sets.push(sql`weight_kg = ${input.weightKg}`)
  if (input.pallets !== undefined)     sets.push(sql`pallets = ${input.pallets}`)
  if (input.notes !== undefined)       sets.push(sql`notes = ${input.notes ?? null}`)
  if (!sets.length) return
  sets.push(sql`date_upd = CURRENT_TIMESTAMP`)
  const setClause = sql.join(sets, sql`, `)
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_routing_tour_stop SET ${setClause} WHERE id_stop = ${idStop}
  `)
}

export async function deleteStopPg(idStop: number): Promise<void> {
  await usePocPg().execute(sql`
    DELETE FROM cs_main.cs_routing_tour_stop WHERE id_stop = ${idStop}
  `)
}

// ──────────────────────────────────────────────────────────────
// Optimize : Nearest Neighbor + total_km haversine
// ──────────────────────────────────────────────────────────────

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export async function optimizeTourPg(idTour: number): Promise<OptimizeResult | null> {
  const d = usePocPg()
  const tourRes = await d.execute<any>(sql`
    SELECT id_tour, depot_lat, depot_lng FROM cs_main.cs_routing_tour
    WHERE id_tour = ${idTour}
  `)
  const tour = ((tourRes as any) as any[])[0]
  if (!tour) return null

  const stopsRes = await d.execute<any>(sql`
    SELECT id_stop, position, lat, lng
    FROM cs_main.cs_routing_tour_stop WHERE id_tour = ${idTour}
  `)
  const stops = (stopsRes as any) as any[]

  const withGps: any[] = []
  const withoutGps: any[] = []
  for (const s of stops) {
    const lat = Number(s.lat)
    const lng = Number(s.lng)
    if (lat !== 0 || lng !== 0) withGps.push({ ...s, lat, lng })
    else withoutGps.push(s)
  }

  const ordered: any[] = []
  let curLat = Number(tour.depot_lat)
  let curLng = Number(tour.depot_lng)
  let totalKm = 0
  const pending = [...withGps]

  while (pending.length) {
    let bestIdx = 0
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = 0; i < pending.length; i++) {
      const dist = haversineKm(curLat, curLng, pending[i].lat, pending[i].lng)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }
    const next = pending.splice(bestIdx, 1)[0]
    totalKm += bestDist
    ordered.push(next)
    curLat = next.lat
    curLng = next.lng
  }

  if (ordered.length) {
    totalKm += haversineKm(curLat, curLng, Number(tour.depot_lat), Number(tour.depot_lng))
  }

  const finalOrder = [...ordered, ...withoutGps]

  for (let i = 0; i < finalOrder.length; i++) {
    await d.execute(sql`
      UPDATE cs_main.cs_routing_tour_stop
         SET position = ${i + 1}, date_upd = CURRENT_TIMESTAMP
       WHERE id_stop = ${finalOrder[i].id_stop}
    `)
  }

  const totalKmRounded = Math.round(totalKm * 100) / 100
  await d.execute(sql`
    UPDATE cs_main.cs_routing_tour
       SET optimized_at = CURRENT_TIMESTAMP,
           total_km = ${totalKmRounded},
           date_upd = CURRENT_TIMESTAMP
     WHERE id_tour = ${idTour}
  `)

  return {
    stopsOrdered: finalOrder.length,
    stopsWithoutGps: withoutGps.length,
    totalKm: totalKmRounded,
  }
}
