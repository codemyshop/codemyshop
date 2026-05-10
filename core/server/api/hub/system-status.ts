/**
 * GET /api/hub/system-status
 * Returns the health status of Intelligence & Marketing modules.
 * Used by the /hub/admin/features page (Feature Control Center).
 */
import type { VisitorAvatar } from '~/types/avatar'

export default defineEventHandler(async () => {
  const config  = useRuntimeConfig()
  const storage = useStorage('avatars')

  // ── Module IA (Claude) ───────────────────────────────────────────────────
  const hasApiKey    = !!config.anthropicApiKey
  const aiMode       = hasApiKey ? 'active' : 'stub'
  const aiSourceType = config.aiSourceType ?? 'contact_form'
  const aiClientId   = config.aiClientId   ?? 'ac-hub'

  // ── Module Avatars ────────────────────────────────────────────────────────
  let avatarTotal  = 0
  const distribution: Record<string, number> = {}

  try {
    const keys        = await storage.getKeys()
    const clientKeys  = keys.filter(k => k.startsWith(`${aiClientId}:`))
    avatarTotal       = clientKeys.length

    for (const key of clientKeys) {
      const avatar = await storage.getItem<VisitorAvatar>(key)
      if (!avatar) continue
      distribution[avatar.type] = (distribution[avatar.type] ?? 0) + 1
    }
  } catch {
    // Storage absent en dev → pas d'erreur
  }

  // ── Module Newsletter ─────────────────────────────────────────────────────
  // Placeholder — sera remplacé par une vérification SMTP / Resend réelle
  const newsletterProvider = 'Non configuré'
  const newsletterStatus   = 'pending' as 'active' | 'pending' | 'error'

  return {
    ai: {
      mode:       aiMode,
      hasApiKey,
      sourceType: aiSourceType,
      clientId:   aiClientId,
      model:      'claude-sonnet-4-6',
    },
    avatars: {
      total:        avatarTotal,
      distribution,
      storageDriver: 'fs',
      storagePath:   './server/data/avatars',
    },
    newsletter: {
      provider: newsletterProvider,
      status:   newsletterStatus,
    },
    checkedAt: new Date().toISOString(),
  }
})
