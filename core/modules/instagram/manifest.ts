/**
 *
 * Manifest of the Instagram module — Phase 5 Misc namespace.
 * Drizzle facade (countInstagramPosts, listInstagramPosts) consumed by
 * /api/instagram/posts.
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcInstagramManifest: ModuleManifest = {
  routes: {
    api: ['GET /api/instagram/posts'],
  },
  hooks: [],
  deps: ['drizzle-orm'],
  tables: ['cs_instagram_post', 'cs_instagram_post_lang'],
}
