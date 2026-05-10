/**
 *
 * GET  /api/hub/api-keys?clientId=example-shop  — returns MASKED keys (never in plain text)
 * POST /api/hub/api-keys                   — saves keys (encrypted on disk)
 *
 * SECURITY:
 * - GET never returns keys in plain text, only masks (sk-a••••••••8f3a)
 * - POST ignores masked values (do not overwrite an existing key with bullets)
 * - Keys are encrypted with AES-256-GCM on disk via api-keys.ts
 */

const MASK_PATTERN = /^\u2022+$|^\*+$/  // détecte les valeurs masquées renvoyées par le front

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // ── GET : clés masquées uniquement ──────────────────────────────────────
  if (method === 'GET') {
    const { clientId } = getQuery(event)
    const id = (clientId as string) || 'ac-hub'

    // On ne déchiffre PAS les clés — on vérifie juste si elles existent
    const hasPsKey = hasStoredKey(id, 'prestashopKey')
    const hasAiKey = hasStoredKey(id, 'aiApiKey')

    // Pour l'URL et les champs non-secrets, on les lit normalement
    const keys = readApiKeys(id)

    return {
      prestashopUrl: keys.prestashopUrl ?? '',
      prestashopKey: hasPsKey ? maskKey(keys.prestashopKey) : '',
      aiProvider:    keys.aiProvider ?? 'anthropic',
      aiApiKey:      hasAiKey ? maskKey(keys.aiApiKey) : '',
      aiModel:       keys.aiModel ?? 'claude-sonnet-4-6',
      updatedAt:     keys.updatedAt ?? null,
      // Indicateurs : y a-t-il un fallback .env ?
      hasPsKey,
      hasAiKey,
      envPsKeySet: !!process.env[`PS_API_KEY_${id.toUpperCase().replace(/-/g, '_')}`],
      envAiKeySet: !!(useRuntimeConfig().anthropicApiKey),
    }
  }

  // ── POST : sauvegarder (chiffré) ───────────────────────────────────────
  if (method === 'POST') {
    const body = await readBody<{
      clientId:       string
      prestashopUrl?: string
      prestashopKey?: string
      aiProvider?:    string
      aiApiKey?:      string
      aiModel?:       string
    }>(event)

    if (!body.clientId) {
      throw createError({ statusCode: 400, message: 'clientId requis' })
    }

    const patch: Partial<{
      prestashopUrl: string
      prestashopKey: string
      aiProvider:    string
      aiApiKey:      string
      aiModel:       string
    }> = {}

    // Champs non-secrets
    if (body.prestashopUrl !== undefined) patch.prestashopUrl = body.prestashopUrl.trim()
    if (body.aiProvider    !== undefined) patch.aiProvider    = body.aiProvider
    if (body.aiModel       !== undefined) patch.aiModel       = body.aiModel.trim()

    // Champs secrets : ignorer si c'est la valeur masquée ou vide
    if (body.prestashopKey && !isMasked(body.prestashopKey)) {
      patch.prestashopKey = body.prestashopKey.trim()
    }
    if (body.aiApiKey && !isMasked(body.aiApiKey)) {
      patch.aiApiKey = body.aiApiKey.trim()
    }

    writeApiKeys(body.clientId, patch)

    return { ok: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

/** Détecte si une valeur est un masque (bullets ou astérisques) */
function isMasked(value: string): boolean {
  if (!value) return true
  // Contains unicode bullets (U+2022)
  if (value.includes('\u2022')) return true
  // Only asterisks
  if (/^\*+$/.test(value)) return true
  // Pattern sk-a••••8f3a
  if (/^.{1,6}\u2022{4,}/.test(value)) return true
  return false
}
