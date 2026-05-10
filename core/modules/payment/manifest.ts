/**
 *
 * Module manifest ac_payment — runtime=nuxt switch PACK #3. Shim legacy (table delegated to another module or no table).
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcPaymentManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: [],
}
