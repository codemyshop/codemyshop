/**
 *
 * Attachment API module manifest — runtime=nuxt since v1.2.0
 * (Phase 9b.2 headless-modules-ts project: list/rename/delete ported
 * Drizzle DB directly in `core/server/utils/attachments-db.ts`).
 *
 * The PrestaShop `upload` controller remains active as long as the filesystem
 * `/download/` of the tenant is not mounted on the Nuxt side (Phase 9b.3).
 *
 * Tables : natives PS uniquement (ps_attachment + _lang + ps_product_attachment).
 */
import type { ModuleManifest } from '../../server/db/schema-pg/module-registry'

export const AcAttachmentapiManifest: ModuleManifest = {
  routes: {},
  hooks: [],
  deps: ['drizzle-orm', 'mysql2'],
  tables: ['ps_attachment', 'ps_attachment_lang', 'ps_product_attachment'],
}
