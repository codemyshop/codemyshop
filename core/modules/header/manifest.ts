/**
 *
 * Header module manifest — Phase 5 back-office UI sub-domain.
 * Drizzle schema + complete facade (get/upsert/upsertLang/replaceLocales).
 * Nuxt consumers refactored to the facade.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcHeaderManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/header-config',
      'PUT /api/header-config/sync',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_header', 'cs_header_lang', 'cs_header_locale', 'cs_header_locale_lang'],
}
