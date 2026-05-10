/**
 *
 * ac_playbook module manifest — Phase 5 Blog/CMS subdomain.
 * Drizzle facade (getPlaybookBySlug, listPlaybooks, findPlaybookByFeatureRole,
 * upsertPlaybook, replacePlaybookRoles) consumed by 4 BO playbook endpoints.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcPlaybookManifest: ModuleManifest = {
  routes: {
    api: [
      'GET /api/bo/playbooks',
      'GET /api/bo/playbooks/:slug',
      'GET /api/bo/playbooks/by-route',
      'POST /api/bo/playbooks/save',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_playbook', 'cs_playbook_role'],
}
