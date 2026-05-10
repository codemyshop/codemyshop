/**
 *
 * Module manifest cmsextra — Phase 5 Blog/CMS subdomain.
 * Drizzle facade (getCmsExtraForBlogEdit, getCmsExtraAvatarTargets,
 * upsertCmsExtra) consumed by bo/marketing/blog/{[id].get,[id].put}
 * and generate-cover (cross-domain). The LEFT JOIN cs_cms_extra in
 * cms.get / cms/[category]/[slug].get / catalogue/articles.get / etc.
 * remain managed by their respective facades (schema drift tolerated
 * cross-tenant).
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcCmsextraManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['cs_cms_extra', 'cs_cms_extra_lang'],
}
