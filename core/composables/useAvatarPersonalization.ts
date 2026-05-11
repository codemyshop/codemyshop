

import type { VisitorAvatar, SectionVisibilityRule, VisitorSignals } from '~/types/avatar'
import { shouldShowForAvatar } from '~/utils/avatar'

export const useAvatarPersonalization = () => {
  
  const avatar     = useState<VisitorAvatar | null>('av_profile', () => null)
  const avatarType = useState<string>('av_type', () => {
    
    if (import.meta.client) {
      return useCookie('ac_avatar_type').value ?? 'unknown'
    }
    return 'unknown'
  })
  const loading = useState<boolean>('av_loading', () => false)

  
  async function fetchAvatar(): Promise<void> {
    try {
      const data = await $fetch<VisitorAvatar>('/api/avatar/me')
      avatar.value     = data
      avatarType.value = data.type
    } catch {
      
    }
  }

  
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
        
        useCookie('ac_avatar_type').value = res.avatar.type
      }
    } catch (err) {
      console.error('[useAvatarPersonalization] submitSignals error:', err)
    } finally {
      loading.value = false
    }
  }

  
  async function resetAvatar(): Promise<void> {
    await $fetch('/api/avatar/reset', { method: 'DELETE' })
    avatar.value     = null
    avatarType.value = 'unknown'
    useCookie('ac_avatar_type').value = null
    useCookie('ac_visitor_id').value  = null
  }

  
  

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
