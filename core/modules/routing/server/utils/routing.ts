/**
 *
 * Routing Facade — B2B logistics planning (delivery routes).
 * Sources of truth (PostgreSQL `cs_main`):
 * - `cs_routing_vehicle`   : fleet (capacity kg/pallets, refrigerated)
 *  - `cs_routing_driver`    : chauffeurs
 * - `cs_routing_tour`      : route (date, vehicle, driver, depot, status)
 * - `cs_routing_tour_stop` : ordered stops (position, window, kg, pallets)
 *
 * Surface :
 * - listVehicles / listDrivers (active support entities)
 * - listTours (planning view + aggregated stops/weight/pallets)
 * - getTourWithStops (details + sorted stops)
 *  - createTour / updateTour / deleteTour (cascade stops)
 *  - addStopToTour / updateStop / deleteStop
 * - optimizeTour (Nearest Neighbor from depot + total_km haversine)
 *
 * Implementation: direct delegation to `routing-pg.ts` (PostgreSQL only,
 * after MariaDB removal, project #38 phase E.4).
 */

import * as pg from './routing-pg'

export type TourStatus = 'planned' | 'in_progress' | 'done' | 'cancelled'
export type StopStatus = 'pending' | 'delivered' | 'failed' | 'skipped'

export const TOUR_STATUSES: TourStatus[] = ['planned', 'in_progress', 'done', 'cancelled']
export const STOP_STATUSES: StopStatus[] = ['pending', 'delivered', 'failed', 'skipped']

interface RoutingContext {
  event?: any
  clientId?: string
}

// ──────────────────────────────────────────────────────────────
// Vehicles & Drivers
// ──────────────────────────────────────────────────────────────

export interface VehicleRow {
  id: number
  label: string
  plate: string
  capacityKg: number
  capacityPallets: number
  refrigerated: number
  active: number
}

export async function listVehicles(_ctx: RoutingContext = {}): Promise<VehicleRow[]> {
  return pg.listVehiclesPg()
}

export interface DriverRow {
  id: number
  firstName: string
  lastName: string
  fullName: string
  phone: string
  licenseType: string
  active: number
}

export async function listDrivers(_ctx: RoutingContext = {}): Promise<DriverRow[]> {
  return pg.listDriversPg()
}

// ──────────────────────────────────────────────────────────────
// Tours
// ──────────────────────────────────────────────────────────────

export interface TourSummary {
  id: number
  label: string
  tourDate: string
  idVehicle: number
  vehicleLabel: string | null
  vehiclePlate: string | null
  idDriver: number
  driverName: string | null
  depotLat: number
  depotLng: number
  status: TourStatus
  optimizedAt: Date | null
  totalKm: number
  stopCount: number
  totalWeight: number
  totalPallets: number
}

export async function listTours(filterDate: string | null, _ctx: RoutingContext = {}): Promise<TourSummary[]> {
  return pg.listToursPg(filterDate)
}

export interface TourDetail {
  id: number
  label: string
  tourDate: string
  idVehicle: number
  vehicleLabel: string | null
  vehiclePlate: string | null
  vehicleCapacityKg: number | null
  vehicleCapacityPallets: number | null
  idDriver: number
  driverName: string | null
  driverPhone: string | null
  depotLat: number
  depotLng: number
  status: TourStatus
  optimizedAt: Date | null
  totalKm: number
}

export interface StopRow {
  id: number
  position: number
  idOrder: number
  idCustomer: number
  customerLabel: string
  address: string
  postcode: string
  city: string
  lat: number
  lng: number
  windowStart: string | null
  windowEnd: string | null
  weightKg: number
  pallets: number
  status: StopStatus
  notes: string | null
}

export async function getTourWithStops(
  idTour: number,
  _ctx: RoutingContext = {},
): Promise<{ tour: TourDetail; stops: StopRow[] } | null> {
  return pg.getTourWithStopsPg(idTour)
}

export interface CreateTourInput {
  label: string
  tourDate: string
  idVehicle?: number
  idDriver?: number
  depotLat?: number
  depotLng?: number
}

export async function createTour(input: CreateTourInput, _ctx: RoutingContext = {}): Promise<void> {
  return pg.createTourPg(input)
}

export interface UpdateTourInput {
  label?: string
  tourDate?: string
  idVehicle?: number
  idDriver?: number
  depotLat?: number
  depotLng?: number
  status?: TourStatus
}

export async function updateTour(idTour: number, input: UpdateTourInput, _ctx: RoutingContext = {}): Promise<void> {
  return pg.updateTourPg(idTour, input)
}

/**
 * Cascade deletion: stops then route (no FK ON DELETE in database).
 */
export async function deleteTour(idTour: number, _ctx: RoutingContext = {}): Promise<void> {
  return pg.deleteTourPg(idTour)
}

// ──────────────────────────────────────────────────────────────
// Stops
// ──────────────────────────────────────────────────────────────

export interface AddStopInput {
  customerLabel: string
  address?: string
  postcode?: string
  city?: string
  lat?: number
  lng?: number
  windowStart?: string | null
  windowEnd?: string | null
  weightKg?: number
  pallets?: number
  idOrder?: number
  idCustomer?: number
  notes?: string | null
}

/**
 * Adds a stop at the end (position = MAX(position)+1).
 */
export async function addStopToTour(
  idTour: number,
  input: AddStopInput,
  _ctx: RoutingContext = {},
): Promise<{ position: number }> {
  return pg.addStopToTourPg(idTour, input)
}

export interface UpdateStopInput {
  status?: StopStatus
  position?: number
  lat?: number
  lng?: number
  address?: string
  postcode?: string
  city?: string
  windowStart?: string | null
  windowEnd?: string | null
  weightKg?: number
  pallets?: number
  notes?: string | null
}

export async function updateStop(idStop: number, input: UpdateStopInput, _ctx: RoutingContext = {}): Promise<void> {
  return pg.updateStopPg(idStop, input)
}

export async function deleteStop(idStop: number, _ctx: RoutingContext = {}): Promise<void> {
  return pg.deleteStopPg(idStop)
}

// ──────────────────────────────────────────────────────────────
// Optimize : Nearest Neighbor + total_km haversine
// ──────────────────────────────────────────────────────────────

export interface OptimizeResult {
  stopsOrdered: number
  stopsWithoutGps: number
  totalKm: number
}

/**
 * Reorders stops by Nearest Neighbor from depot (lat/lng).
 * Stops without GPS (lat=0 AND lng=0) placed at the end in their original order.
 * Updates positions + total_km (haversine, return to depot included) + optimized_at.
 */
export async function optimizeTour(
  idTour: number,
  _ctx: RoutingContext = {},
): Promise<OptimizeResult | null> {
  return pg.optimizeTourPg(idTour)
}
