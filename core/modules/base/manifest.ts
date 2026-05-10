/**
 *
 * Base module manifest — runtime=nuxt switch PACK #3.
 * Module without dedicated install.sql: tables created via classes/ ObjectModel
 * (PrestaShop pattern) or not yet materialized. Drizzle schema to add when
 * a Nuxt consumer emerges.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcBaseManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: [],
}
