/**
 *
 * Hook module manifest — Phase 4 headless-modules-ts.
 *
 * Serialized in `cs_module_registry.manifest_json` when we switch
 * `runtime='nuxt'`. Allows the admin `/hub` and diagnostic tools
 * to introspect the layer scope without loading the files.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acHookManifest: ModuleManifest = {
  routes: {
    api: [
      'GET  /api/hooks',
    ],
  },
  hooks: [],
  deps: [
    'drizzle-orm',
    'mysql2',
  ],
  tables: [
    'cs_hook',
  ],
}
