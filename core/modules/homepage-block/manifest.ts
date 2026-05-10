/**
 *
 * Homepage block module manifest — Phase 5 back-office UI sub-domain.
 * Drizzle schema + facade (list/insert/upsertLang/delete) consumed by
 * the homepage-config + homepage-sections endpoints via the facade
 * ac_homepagesection.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcHomepageblockManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_homepage_block', 'cs_homepage_block_lang'],
}
