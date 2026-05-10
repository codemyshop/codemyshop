/**
 *
 * CmsCategoryExtra module manifest — Phase 4 headless-modules-ts.
 *
 * Note: the facade only owns the writes and pure counts/lists on
 * `cs_category_cms`. The 4 endpoints that do LEFT JOINs with
 * ps_cms_lang / ps_category_lang / cs_cms_extra keep their native SQL
 * (the Drizzle schemas for these PS tables are not yet introduced).
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acCmsCategoryExtraManifest: ModuleManifest = {
  routes: {
    api: [
      'PUT /api/bo/categories/:id   (consumer replace via façade)',
      'PUT /api/bo/marketing/blog/:id (consumer replace via façade)',
    ],
    consumers_native_sql: [
      'GET /api/catalogue/articles  (LEFT JOIN ps_cms_lang + cs_cms_extra)',
      'GET /api/bo/categories/:id   (LEFT JOIN ps_cms_lang + cs_cms_extra)',
      'GET /api/bo/marketing/blog/:id (LEFT JOIN ps_category_lang)',
    ],
  },
  hooks: [],
  deps: [
    'drizzle-orm',
    'mysql2',
  ],
  tables: [
    'cs_category_cms',
  ],
}
