<template>
  <div :style="themeStyles" :class="[darkPage ? 'text-foreground font-sans' : 'bg-background text-foreground font-sans', shadowClass]">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    
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

const colorMode = 'light' as const

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

</script>

<style>
/* Global — applique la typo à TOUT le DOM y compris les Teleport hors du root app */
body, body *, body button, body input, body select, body textarea {
  font-family: var(--font-family, 'Inter', system-ui, sans-serif);
}
</style>
