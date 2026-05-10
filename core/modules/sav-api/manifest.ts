/**
 *
 * Module ac_savapi manifest — switch to Nuxt runtime, phase #3.
 * Module without dedicated install.sql: tables created via classes/ ObjectModel
 * (PrestaShop pattern) or not yet materialized. Drizzle schema to add when
 * a Nuxt consumer emerges.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcSavapiManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: [],
}
