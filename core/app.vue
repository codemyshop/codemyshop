<template>
  <div :style="themeStyles" :class="[darkPage ? 'text-foreground font-sans' : 'bg-background text-foreground font-sans', shadowClass]">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Lazy + v-if : ces 2 composants ne servent qu'aux admins connectés.
         Pour les visiteurs anonymes (99% du trafic), 0 byte téléchargé. -->
    <ClientOnly>
      <LazyPreviewBanner v-if="previewMode" />
      <LazyBuilderToolbar v-if="canEdit" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const darkPage = computed(() => route.meta.darkPage === true)
const { themeStyles, shadowClass, contentWidthClass, config } = useClientTheme()
const { theme: themeDb } = useThemeDb()
const { init: initDark } = useDarkMode()
const { init: initEditMode, canEdit } = useEditMode()
const { previewMode } = useClientDetection()

// Doctrine 2026-05-10: universal light mode everywhere (storefront and hub, all tenants).
// No more dark mode, no more toggle. The `cs_theme.default_color_mode` column
// has no effect — kept for schema backward-compatibility, ignored by the code.
const colorMode = 'light' as const

// Preconnect Matomo analytics (Lighthouse LCP gain ~310 ms on catalog).
// @nuxt/scripts loads matomo.js onNuxtReady → without preconnect, the DNS+TLS+TCP
// chain starts late. preconnect in <head> establishes the connection
// in parallel with HTML.
const runtimeConfig = useRuntimeConfig()
const matomoUrl = (runtimeConfig.public.matomoUrl as string) || ''

useHead({
  link: matomoUrl ? [
    { rel: 'preconnect', href: matomoUrl, crossorigin: '' },
  ] : [],
})

provide('contentWidthClass', contentWidthClass)

onMounted(() => {
  initDark(colorMode)
  initEditMode()
})

// Fonts are self-hosted at build by @nuxt/fonts (cf nuxt.config.ts).
// Zero blocking requests to googleapis, auto subset, font-display:swap.
</script>

<style>
/* Global — applies typography to the entire DOM including Teleport elements outside the root app */
body, body *, body button, body input, body select, body textarea {
  font-family: var(--font-family, 'Inter', system-ui, sans-serif);
}
</style>
