<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  Bouton pilotage démo — apparaît seulement si tenant a `isDemo: true` dans
  runtimeConfig.public. Position fixed bottom-left, 3 actions :
    - Vitrine CodeMyShop (retour produit)
    - Hub admin
    - Repo GitHub AGPL

  Pattern Nuxt DevTools : pill collapsée par défaut, expand au click.
-->
<script setup lang="ts">
const _cfg = useRuntimeConfig()
const isDemo = computed(() => Boolean((_cfg.public as any)?.isDemo))
const expanded = ref(false)
function toggle() { expanded.value = !expanded.value }

const VITRINE_URL = 'https://codemyshop.com'
const GITHUB_URL  = 'https://github.com/codemyshop/codemyshop'
</script>

<template>
  <ClientOnly>
    <div
      v-if="isDemo"
      class="fixed bottom-4 left-4 z-[60] flex items-center gap-2"
      role="region"
      aria-label="Contrôles démo"
    >
      <button
        type="button"
        :aria-expanded="expanded"
        aria-label="Pilotage de la démo"
        class="flex items-center gap-2 px-3 py-2 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg hover:bg-red-700 transition-colors"
        @click="toggle"
      >
        <span class="w-2 h-2 rounded-full bg-white animate-pulse" />
        DÉMO
        <svg class="w-3 h-3 transition-transform" :class="{ 'rotate-180': expanded }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
      </button>

      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-x-2"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="expanded" class="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-200 dark:border-slate-700 p-1">
          <a
            :href="VITRINE_URL"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Site vitrine CodeMyShop"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12 12 3l9 9M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" /></svg>
            <span>Vitrine</span>
          </a>
          <NuxtLink
            to="/hub/login"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Hub admin — login pré-rempli demo / demo"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17 9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" /></svg>
            <span>Hub admin</span>
          </NuxtLink>
          <a
            :href="GITHUB_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Repo GitHub AGPL-3.0"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.18-.02-2.13-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18a10.97 10.97 0 0 1 5.74 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.56 4.56-1.52 7.85-5.83 7.85-10.91C23.5 5.65 18.35.5 12 .5Z" /></svg>
            <span>GitHub</span>
          </a>
        </div>
      </Transition>
    </div>
  </ClientOnly>
</template>
