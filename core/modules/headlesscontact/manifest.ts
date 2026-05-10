/**
 *
 * Headless contact module manifest — Phase 5 miscellaneous sub-domain.
 * Drizzle facade (insertContactMessage) consumed by POST /api/contact.
 * Cross-domain consumption in /api/bo/leads (UNION smartlead) remains
 * driven by the smartlead domain.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcHeadlesscontactManifest: ModuleManifest = {
  routes: {
    api: [
      'POST /api/contact',
    ],
  },
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_headlesscontact_message'],
}
