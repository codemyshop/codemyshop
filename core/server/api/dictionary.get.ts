/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/dictionary
 * GET /api/dictionary?slug=synedre
 * Technical dictionary from DB (real-time). Single source: cs_dictionary.
 * Read via Drizzle facade `core/modules/dictionary`.
 */
import {
  getDictionaryEntryBySlug,
  listDictionaryEntries,
} from '~/internal/dictionary/server/utils/dictionary'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = query.slug as string | undefined
  const config = useRuntimeConfig()
  const clientId = (config as any).clientId || 'ac'

  try {
    if (slug) {
      const entry = await getDictionaryEntryBySlug(slug, clientId, { event })
      if (!entry) return { error: 'not_found' }
      return entry
    }

    const entries = await listDictionaryEntries(clientId, { event })
    return { entries }
  } catch (err: any) {
    console.error('[API dictionary] DB error:', err.message)
    return { entries: [], error: 'DB unavailable' }
  }
})
