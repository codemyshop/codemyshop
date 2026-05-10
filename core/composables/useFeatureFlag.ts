/**
 *
 * Client-side composable for multi-tenant feature flags.
 * Loads enabled features for the current tenant on mount,
 * exposes a reactive helper `hasFeature(id)` for v-if in templates.
 */

export interface CatalogFeatureWithState {
  id:           string
  name:         string
  description:  string
  icon:         string
  category:     string
  monthlyPrice: number
  status:       string
  badge?:       string
  route?:       string
  enabled:      boolean
}

export const useFeatureFlag = () => {
  const { resolvedClientId } = useClientDetection()
  const features = useState<CatalogFeatureWithState[]>('feature_flags', () => [])
  const loaded   = useState('feature_flags_loaded', () => false)

  async function loadFeatures() {
    try {
      features.value = await $fetch<CatalogFeatureWithState[]>('/api/hub/features-catalog', {
        query: { clientId: resolvedClientId.value },
      })
      loaded.value = true
    } catch {
      features.value = []
    }
  }

  function hasFeature(featureId: string): boolean {
    return features.value.some(f => f.id === featureId && f.enabled)
  }

  async function toggleFeature(featureId: string, enable: boolean) {
    await $fetch('/api/hub/toggle-feature', {
      method: 'POST',
      body: { clientId: resolvedClientId.value, featureId, action: enable ? 'enable' : 'disable' },
    })
    // Mettre à jour localement
    const idx = features.value.findIndex(f => f.id === featureId)
    if (idx >= 0) features.value[idx].enabled = enable
  }

  return { features, loaded, loadFeatures, hasFeature, toggleFeature }
}
