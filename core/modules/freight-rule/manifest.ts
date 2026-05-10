/**
 *
 * FreightRule module manifest — Phase 4 headless-modules-ts.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acFreightRuleManifest: ModuleManifest = {
  routes: {
    api: [
      'GET    /api/bo/freight',
      'POST   /api/bo/freight',
      'PUT    /api/bo/freight/:id',
      'DELETE /api/bo/freight/:id',
      'GET    /api/bo/freight/resolve',
    ],
  },
  hooks: [],
  deps: [
    'drizzle-orm',
    'mysql2',
  ],
  tables: [
    'cs_freight_rule',
  ],
}
