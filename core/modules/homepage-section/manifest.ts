/**
 *
 * Module manifest — Phase 5 admin subdomain UI.
 * Drizzle schema + complete facade (list/order/config/lang/wipe/insert helpers).
 * Nuxt consumers refactored toward the facade; coupled with ac_homepageblock for
 * payload → blocks decomposition.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcHomepagesectionManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/homepage-config',
      'PUT /api/homepage-config/sync',
      'GET /api/homepage-sections',
      'POST /api/homepage-sections',
      'PUT /api/homepage-sections/:id',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_homepage_section', 'cs_homepage_section_lang', 'cs_homepage_section_avatar'],
}
