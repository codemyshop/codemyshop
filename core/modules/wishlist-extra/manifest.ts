/**
 *
 * Manifest of the ac_wishlistextra module — runtime=nuxt since v1.2.0
 * (Phase 9b.1 chantier headless-modules-ts : DB-Only Drizzle).
 *
 * The associated PS module is now schema-only (3 owned tables);
 * all logic lives in `core/server/api/wishlist/*` + `wishlist-db.ts`.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcWishlistextraManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['ps_wishlist', 'ps_wishlist_product', 'cs_wishlist_extra'],
}
