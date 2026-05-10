/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/hub/design-systems — catalog of design systems (Drizzle DB direct).
 *
 * Token-gate preserved: `AC_MARKETPLACE_TOKEN` remains required on the env side even
 * in direct DB mode. Without token → empty list (front compat).
 */
import { listDesignSystems } from '~/server/utils/hub-design-systems-db'

interface DesignSystem {
  id: string
  name: string
  description: string
  tokens: Record<string, string>
}

export default defineEventHandler(async (): Promise<DesignSystem[]> => {
  const token = process.env.NUXT_AC_MARKETPLACE_TOKEN || process.env.AC_MARKETPLACE_TOKEN || ''
  if (!token) return []
  try {
    return await listDesignSystems()
  } catch (e) {
    console.warn('[design-systems] erreur DB:', (e as Error).message)
    return []
  }
})
