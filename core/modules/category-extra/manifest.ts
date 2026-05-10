/**
 *
 * Manifest for module CategoryExtra — Phase 4 headless-modules-ts.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acCategoryExtraManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/category (consumer getCategoryH1)',
      'GET /api/bo/categories/:id (consumer getCategoryH1)',
      'PUT /api/bo/categories/:id (consumer upsertCategoryH1)',
    ],
  },
  hooks: [],
  deps: [
    'drizzle-orm',
    'mysql2',
  ],
  tables: [
    'cs_category_extra',
    'cs_category_extra_lang',
  ],
}
