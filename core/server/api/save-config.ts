/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/save-config
 *
 * Persists tenant config directly to DB (cs_client_config) via the
 * ac_clientconfig facade. Admin auth via Nuxt (cookie hub_session).
 *
 * Expected body (NEW flat schema):
 *   { clientId: string, config: { ...flat document multilang inline... } }
 *
 * Transitory compat shim: if the body sends the old sliced schema
 *   { clientId, theme, header, footer, homepage, sections, ... }
 * we flatten `header.*` to top-level before saving.
 */

import { getClientConfigJson, upsertClientConfigJson } from '~/internal/clientconfig/server/utils/clientconfig'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }
  if (!session.isAdmin) {
    throw createError({ statusCode: 403, message: 'Accès réservé aux administrateurs' })
  }

  const body = await readBody<Record<string, unknown>>(event)

  if (!body.clientId || typeof body.clientId !== 'string') {
    throw createError({ statusCode: 400, message: 'clientId is required' })
  }
  const clientId = body.clientId as string
  if (!/^[a-z0-9-]+$/.test(clientId)) {
    throw createError({ statusCode: 400, message: 'Invalid clientId' })
  }

  let config: Record<string, unknown>
  if (body.config && typeof body.config === 'object' && !Array.isArray(body.config)) {
    config = body.config as Record<string, unknown>
  } else {
    const { clientId: _id, header, ...slices } = body as any
    config = {
      ...slices,
      ...(header && typeof header === 'object' ? header : {}),
    }
  }

  // Strip des slices i18n obsolètes (DB-first strict)
  // topBar + logo  → cs_header + _lang
  // menu           → cs_megamenu + _lang
  // footer         → cs_footer + _config + _social + _lang
  // homepage       → cs_homepage_section + _blocks + _lang
  // blog           → ps_cms_category natif PS
  const STRIP = ['topBar', 'logo', 'menu', 'footer', 'homepage', 'blog']
  for (const k of STRIP) delete config[k]

  // Upsert non-destructif : merge avec config existante pour ne pas écraser
  // les slices top-level absents du body (ex. navBar, defaultColorMode).
  try {
    const existingJson = await getClientConfigJson(clientId, { event })
    let existing: Record<string, unknown> = {}
    if (existingJson) {
      try { existing = JSON.parse(existingJson) } catch { existing = {} }
    }
    const merged = { ...existing, ...config }
    await upsertClientConfigJson(clientId, JSON.stringify(merged), { event })
    return { success: true, clientId }
  } catch (err: any) {
    console.error('[save-config] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + err.message })
  }
})
