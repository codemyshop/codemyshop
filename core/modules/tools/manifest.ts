/**
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acToolsManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_tools'],
}
