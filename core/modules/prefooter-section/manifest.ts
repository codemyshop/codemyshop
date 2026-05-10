/**
 *
 * Module manifest ac_prefootersection — Phase 5 BO UI subdomain.
 * Drizzle schema + complete facade (list/order/limitItems/touch/upsertLang).
 * Nuxt consumers refactored to the facade.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcPrefootersectionManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/prefooter-sections',
      'POST /api/prefooter-sections',
      'PUT /api/prefooter-sections/:id',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_prefooter_section', 'cs_prefooter_section_lang'],
}
