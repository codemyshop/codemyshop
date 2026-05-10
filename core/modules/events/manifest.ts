/**
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const acEventsManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_events', 'cs_event_registrations'],
}
