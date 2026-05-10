/**
 *
 * Module manifest ac_productextra — runtime=nuxt switch PACK #3.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcProductextraManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ["cs_product_extra", "cs_product_extra_lang", "cs_product_ai_queue"],
}
