/**
 *
 * Availability module manifest — runtime=nuxt switch PACK #3.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcAvailabilityManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ["cs_availability"],
}
