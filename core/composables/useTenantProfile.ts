

export type BusinessVertical = 'food' | 'beauty' | 'vape' | 'fashion' | 'services' | 'electronics' | 'generic'
export type BusinessChannel = 'pure-online' | 'phygital' | 'b2b-only' | 'marketplace' | 'mix'

interface BusinessProfile {
  vertical: BusinessVertical
  channel: BusinessChannel
}

const DEFAULT_PROFILE: BusinessProfile = { vertical: 'generic', channel: 'pure-online' }

export const useTenantProfile = () => {
  const profile = useState<BusinessProfile | null>('tenant_business_profile', () => null)
  const loading = useState<boolean>('tenant_business_profile_loading', () => false)

  async function ensureLoaded() {
    if (profile.value || loading.value) return
    if (!import.meta.client) return
    loading.value = true
    try {
      const data = await $fetch<BusinessProfile>('/api/hub/configuration/business-profile')
      profile.value = {
        vertical: (data?.vertical as BusinessVertical) || 'generic',
        channel: (data?.channel as BusinessChannel) || 'pure-online',
      }
    } catch {
      profile.value = { ...DEFAULT_PROFILE }
    } finally {
      loading.value = false
    }
  }

  if (import.meta.client) {
    ensureLoaded()
  }

  const vertical = computed<BusinessVertical>(() => profile.value?.vertical ?? 'generic')
  const channel = computed<BusinessChannel>(() => profile.value?.channel ?? 'pure-online')

  return {
    profile,
    vertical,
    channel,
    isFood: computed(() => vertical.value === 'food'),
    isVape: computed(() => vertical.value === 'vape'),
    isPhygital: computed(() => channel.value === 'phygital'),
    isB2BOnly: computed(() => channel.value === 'b2b-only'),
    isMarketplace: computed(() => channel.value === 'marketplace'),
    refresh: () => { profile.value = null; ensureLoaded() },
  }
}
