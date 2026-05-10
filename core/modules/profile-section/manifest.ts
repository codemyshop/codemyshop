/**
 *
 * ProfileSection module manifest — Phase 4 headless-modules-ts.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acProfileSectionManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/bo/team/profile-sections',
      'PUT /api/bo/team/profile-sections/:id',
    ],
  },
  hooks: [],
  deps: [
    'drizzle-orm',
    'mysql2',
  ],
  tables: [
    'cs_profile_section',
  ],
}
