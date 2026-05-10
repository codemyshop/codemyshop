/**
 *
 * Avatars module manifest — Phase 5 Misc subdomain.
 * Drizzle facade (getAvatarDefinitionForCover) consumed in cross-domain
 * by ac_covergen / generate-cover (no direct API route: the table
 * is backoffice-only via PrestaShop, the Nuxt module just exposes the lookup runtime).
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcAvatarsManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_avatar_definition'],
}
