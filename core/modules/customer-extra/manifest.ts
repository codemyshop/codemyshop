/**
 *
 * Module manifest CustomerExtra — Phase 4 headless-modules-ts.
 *
 * Note: 2 BO endpoints (list customers, abandoned-carts) keep their LEFT
 * native SQL JOIN on cs_customer_extra because the join covers multiple
 * tables PS (ps_customer, ps_address, ps_orders, ps_addifycustomercustomdata).
 * The Drizzle facade is used for 1:1 operations (get/upsert/delete).
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acCustomerExtraManifest: ModuleManifest = {
  routes: {
    api: [
      'POST /api/catalogue/customer/register (consumer upsert)',
      'GET  /api/bo/customers/:id  (consumer get)',
      'PUT  /api/bo/customers/:id  (consumer upsert/delete)',
      'GET  /api/bo/customers      (LEFT JOIN natif — non refacto)',
      'GET  /api/bo/abandoned-carts (LEFT JOIN natif — non refacto)',
    ],
  },
  hooks: [],
  deps: [
    'drizzle-orm',
    'mysql2',
  ],
  tables: [
    'cs_customer_extra',
  ],
}
