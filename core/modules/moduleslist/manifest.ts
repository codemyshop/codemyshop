/**
 *
 * Module manifest ac_moduleslist — runtime=nuxt switch PACK #3.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcModuleslistManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ["cs_moduleslist"],
}
