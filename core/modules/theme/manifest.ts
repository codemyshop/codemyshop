/**
 *
 * Module Theme manifest — Phase 4 headless-modules-ts.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acThemeManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/theme',
      'PUT /api/theme/sync',
      'GET /api/orders/:id/invoice (consumer accentColor)',
      'GET /api/orders/invoices    (consumer accentColor)',
    ],
  },
  hooks: [],
  deps: [
    'drizzle-orm',
    'mysql2',
  ],
  tables: [
    'cs_theme',
  ],
}
