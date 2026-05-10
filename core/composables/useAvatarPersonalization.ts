/**
 * Composable de Personnalisation IA — Avatars Visiteurs.
 *
 * Page-side usage:
 *   const { avatarType, shouldShow, submitSignals } = useAvatarPersonalization()
 *   await submitSignals({ pagesViewed: [route.path] })
 *   v-show="shouldShow(section.visibility)"
 */
import type { VisitorAvatar, SectionVisibilityRule, VisitorSignals } from '~/types/avatar'
import { shouldShowForAvatar } from '~/utils/avatar'

export const useAvatarPersonalization = () => {
  // ── État global partagé (SSR-safe) ─────────────────────────────────────
  const avatar     = useState<VisitorAvatar | null>('av_profile', () => null)
  const avatarType = useState<string>('av_type', () => {
    // Initialisation depuis cookie si disponible (client-side only)
    if (import.meta.client) {
      return useCookie('ac_avatar_type').value ?? 'unknown'
    }
    return 'unknown'
  })
  const loading = useState<boolean>('av_loading', () => false)

  // ── Fetch profil courant ───────────────────────────────────────────────
  async function fetchAvatar(): Promise<void> {
    try {
      const data = await $fetch<VisitorAvatar>('/api/avatar/me')
      avatar.value     = data
      avatarType.value = data.type
    } catch {
      // 404 = pas encore classifié → pas d'erreur
    }
  }

  // ── Soumettre signaux et déclencher la classification ──────────────────
  async function submitSignals(signals: VisitorSignals): Promise<void> {
    if (loading.value) return
    loading.value = true
    try {
      const res = await $fetch<{ ok: boolean; avatar: VisitorAvatar }>('/api/avatar/analyze', {
        method: 'POST',
        body:   { signals },
      })
      if (res.ok) {
        avatar.value     = res.avatar
        avatarType.value = res.avatar.type
        // Sync cookie côté client
        useCookie('ac_avatar_type').value = res.avatar.type
      }
    } catch (err) {
      console.error('[useAvatarPersonalization] submitSignals error:', err)
    } finally {
      loading.value = false
    }
  }

  // ── Reset (tests) ──────────────────────────────────────────────────────
  async function resetAvatar(): Promise<void> {
    await $fetch('/api/avatar/reset', { method: 'DELETE' })
    avatar.value     = null
    avatarType.value = 'unknown'
    useCookie('ac_avatar_type').value = null
    useCookie('ac_visitor_id').value  = null
  }

  // ── Visibilité conditionnelle ──────────────────────────────────────────
  /**
   * Returns true if the section should be displayed for the current avatar.
   * In the absence of a rule (or empty avatars), always true.
   */
  function shouldShow(rule?: SectionVisibilityRule | null): boolean {
    return shouldShowForAvatar(avatarType.value as any, rule)
  }

  return {
    avatar,
    avatarType,
    loading,
    fetchAvatar,
    submitSignals,
    resetAvatar,
    shouldShow,
  }
}
