/**
 *
 * Module manifest of ac_moduleregistry — the module owns `cs_module_registry`
 * (table created by sql/install.sql from the module). The Drizzle schema is
 * directly in core/server/db/schema-pg/module-registry.ts (used by
 * the entire runtime). The facade is located in core/server/utils/module-registry.ts.
 *
 * Note on the directory naming in core/modules/: "module-registry-runtime/" to avoid
 * collision with the schema file core/server/db/schema-pg/module-registry.ts.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acModuleregistryManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/admin/modules',
      'GET /api/admin/modules/:codename',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_module_registry'],
}
