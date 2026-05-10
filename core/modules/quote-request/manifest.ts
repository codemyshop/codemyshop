/**
 *
 * quoterequest module manifest — Phase 5 B2B business subdomain.
 * Drizzle schema + complete facade + Nuxt consumers refactored to the facade.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcQuoterequestManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/bo/quotes',
      'GET /api/bo/quotes/:id',
      'PUT /api/bo/quotes/:id/status',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_quote_request', 'cs_quote_request_item'],
}
