/**
 *
 * Redirect module manifest — Phase 4 headless-modules-ts.
 *
 * Serialized in `cs_module_registry.manifest_json` when we switch
 * `runtime='nuxt'`. Documents the single surface: the Nitro middleware for
 * redirection 301/302 legacy.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acRedirectManifest: ModuleManifest = {
  routes: {
    middleware: [
      'core/server/middleware/02-legacy-redirects.ts',
    ],
  },
  hooks: [],
  deps: [
    'drizzle-orm',
    'mysql2',
  ],
  tables: [
    'cs_redirect',
  ],
}
