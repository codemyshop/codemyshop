
    <EnterpriseUpgradeCard feature-id="lead.capa" compact />

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  
  featureId: string
  
  compact?: boolean
  
  contactUrl?: string
}>(), {
  compact: false,
  contactUrl: 'https://codemyshop.com/contact',
})

const { features, loaded, loadFeatures } = useFeatureFlag()

const meta = computed(() =>
  features.value.find(f => f.id === props.featureId) ?? null,
)

onMounted(() => {
  if (!loaded.value) loadFeatures()
})
</script>

<template>
  
  <span
    v-if="compact"
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200"
  >
    <span aria-hidden="true">🔒</span>
    Enterprise
  </span>

  
  <div
    v-else
    class="relative overflow-hidden rounded-xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 p-5"
  >
    
    <span class="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
      <span aria-hidden="true">⭐</span>
      ENTERPRISE
    </span>

    <div class="flex items-start gap-4">
      
      <div class="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm border border-indigo-100 text-2xl">
        {{ meta?.icon || '🔒' }}
      </div>

      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-bold text-slate-900 mb-1">
          {{ meta?.name || featureId }}
        </h4>
        <p class="text-xs text-slate-600 leading-relaxed mb-3">
          {{ meta?.description || 'This feature requires the Enterprise edition.' }}
        </p>
        <a
          :href="contactUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          Upgrade to Enterprise →
        </a>
      </div>
    </div>
  </div>
</template>
