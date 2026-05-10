/**
 *
 * Footer module manifest — Phase 5 admin UI subdomain.
 * Drizzle schema + complete facade (links CRUD + config CRUD + socials replace).
 * Nuxt consumers refactored to the facade.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcFooterManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/footer',
      'POST /api/footer-links',
      'PUT /api/footer-links/:id',
      'DELETE /api/footer-links/:id',
      'GET /api/footer-config',
      'PUT /api/footer-config/sync',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: [
    'cs_footer', 'cs_footer_lang',
    'cs_footer_config', 'cs_footer_config_lang',
    'cs_footer_social', 'cs_footer_social_lang',
  ],
}
