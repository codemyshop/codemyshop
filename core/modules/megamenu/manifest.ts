/**
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acMegamenuManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/megamenu',
      'PUT /api/megamenu/sync',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_megamenu', 'cs_megamenu_lang'],
}
