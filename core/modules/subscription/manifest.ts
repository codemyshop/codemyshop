/**
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acSubscriptionManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_subscription'],
}
