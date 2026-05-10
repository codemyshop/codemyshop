/**
 *
 * routing module manifest — Phase 5 B2B business subdomain.
 * Drizzle schema + complete facade (vehicles/drivers list,
 * tours CRUD, stops CRUD, optimize Nearest Neighbor + haversine).
 * Backoffice consumers refactored towards the facade.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcRoutingManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/bo/routing/vehicles',
      'GET /api/bo/routing/drivers',
      'GET /api/bo/routing/tours',
      'POST /api/bo/routing/tours',
      'GET /api/bo/routing/tours/:id',
      'PUT /api/bo/routing/tours/:id',
      'DELETE /api/bo/routing/tours/:id',
      'POST /api/bo/routing/tours/:id/stops',
      'POST /api/bo/routing/tours/:id/optimize',
      'PUT /api/bo/routing/stops/:id',
      'DELETE /api/bo/routing/stops/:id',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_routing_vehicle', 'cs_routing_driver', 'cs_routing_tour', 'cs_routing_tour_stop'],
}
