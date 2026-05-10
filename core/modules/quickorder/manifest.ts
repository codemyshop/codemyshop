/**
 *
 * ac_quickorder module manifest — Phase 5, B2B Business subdomain.
 * Drizzle schema + complete facade (lists CRUD + reorder).
 * `bulk.post` remains raw SQL: coupling with cs_price_* refactored in
 * same time as the ac_pricing facade (step 4/5).
 * `parse.post` without SQL — not affected.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcQuickorderManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/bo/quick-order',
      'POST /api/bo/quick-order/lists',
      'GET /api/bo/quick-order/lists/:id',
      'DELETE /api/bo/quick-order/lists/:id',
      'POST /api/bo/quick-order/bulk',
      'POST /api/bo/quick-order/parse',
      'GET /api/bo/quick-order/reorder/:idOrder',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_quick_order_list', 'cs_quick_order_line'],
}
