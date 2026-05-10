/**
 *
 * GET /api/hub/global-secrets — global secrets metadata (SuperAdmin SaaS only)
 * POST /api/hub/global-secrets — write a global secret (SuperAdmin SaaS only)
 *
 * SECURITY:
 * - Read/write reserved for SuperAdmin SaaS (root@/founder@/contact@).
 * - GET never returns values in plaintext, only
 * `{ exists, email?, projectId?, updatedAt }` for the Google service account.
 * - POST encrypts before writing via writeGlobalSecret().
 */

import { getSession, isSuperAdminSaaS } from '~/server/utils/session'
import { readGlobalSecret, writeGlobalSecret, hasGlobalSecret } from '~/server/utils/secrets'

const SLUG_GSC = 'gscServiceAccount'

function requireSuperAdmin(event: any) {
  const session = getSession(event)
  if (!session || !isSuperAdminSaaS(session)) {
    throw createError({ statusCode: 403, message: 'Accès réservé SuperAdmin SaaS' })
  }
  return session
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  requireSuperAdmin(event)

  // ── GET : métadonnées (jamais le JSON brut) ────────────────────────────
  if (method === 'GET') {
    const exists = await hasGlobalSecret(SLUG_GSC)
    let email: string | null = null
    let projectId: string | null = null

    if (exists) {
      try {
        const json = await readGlobalSecret(SLUG_GSC)
        if (json) {
          const parsed = JSON.parse(json)
          email = parsed.client_email ?? null
          projectId = parsed.project_id ?? null
        }
      } catch {
        // JSON corrompu — on signale juste l'existence
      }
    }

    return {
      gscServiceAccount: {
        exists,
        email,
        projectId,
      },
    }
  }

  // ── POST : écriture chiffrée ───────────────────────────────────────────
  if (method === 'POST') {
    const body = await readBody<{ gscServiceAccountJson?: string }>(event)
    const raw = (body.gscServiceAccountJson ?? '').trim()

    if (!raw) {
      throw createError({ statusCode: 400, message: 'gscServiceAccountJson requis' })
    }

    // Validation : doit être un JSON SA Google valide
    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw createError({ statusCode: 400, message: 'JSON invalide' })
    }

    if (parsed.type !== 'service_account' || !parsed.client_email || !parsed.private_key) {
      throw createError({
        statusCode: 400,
        message: 'JSON Service Account invalide (type/client_email/private_key requis)',
      })
    }

    const propagation = await writeGlobalSecret(SLUG_GSC, raw, 'broadcast')

    return {
      ok: true,
      gscServiceAccount: {
        exists: true,
        email: parsed.client_email,
        projectId: parsed.project_id ?? null,
      },
      propagation,  // { written: ['_local','example-shop',...], failed: [...] }
    }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
