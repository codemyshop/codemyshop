<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="previewMode"
        class="fixed bottom-4 right-4 z-[200] flex items-center gap-2.5
               bg-gray-900/90 backdrop-blur-sm text-white
               rounded-full px-3.5 py-2 shadow-xl text-xs font-medium
               border border-white/10"
      >
        <!-- Dot indicateur -->
        <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />

        <!-- Label -->
        <span class="text-gray-300">{{ t('common.preview_label') }}</span>
        <span class="font-semibold tracking-wide text-amber-300">{{ displayName }}</span>

        <!-- Separator -->
        <span class="w-px h-3.5 bg-white/20 shrink-0" />

        <!-- Bouton quitter -->
        <button
          @click="exitPreview"
          class="flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
          :title="t('common.exit_preview_aria')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
          {{ t('common.exit_preview_btn') }}
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { t } = useT()
const { previewMode, resolvedClientId, previewClient } = useClientDetection()
const { header } = useHeaderDb()

// Display name: client's logo.text > raw previewClient (fallback if client unknown)
const displayName = computed(() =>
  header.value?.logo?.text
  ?? previewClient.value
  ?? resolvedClientId.value
)

// Uses the /exit-preview server route that expires the cookie via Set-Cookie header directly
// — more reliable than useCookie().value = null in route middleware
function exitPreview() {
  window.location.href = '/exit-preview'
}
</script>
