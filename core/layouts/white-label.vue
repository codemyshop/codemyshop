<template>
  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <!-- IFRAME PREVIEW MODE — minimal rendering without sidebar or toolbar.           -->
  <!-- This branch activates when the layout is rendered INSIDE the iframe of    -->
  <!-- the builder (mobile/tablet). Tailwind media queries then use the -->
  <!-- largeur de l'iframe → vraie simulation responsive.                     -->
  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <div v-if="isInsideIframe" class="min-h-screen bg-background text-foreground font-sans">
    <LayoutTheHeader />
    <main :class="[isEditMode ? 'edit-mode' : '', 'pb-24 sm:pb-0']">
      <slot />
    </main>
    <LayoutPrefooterZone />
    <LayoutTheFooter />
    <MobileStickyBar />
    <DemoControlBar />
    <ClientOnly>
      <LazyCartDrawer v-if="cartEnabled" />
      <LazyQuoteDrawer />
      <LazyChatbotWidget v-if="chatbotEnabled" />
    </ClientOnly>
  </div>

  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <!-- MODE PARENT — sidebar + toolbar + (iframe preview | render direct).    -->
  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <div v-else class="min-h-screen bg-background text-foreground font-sans flex">

    <!-- ── Builder Sidebar (edit mode uniquement, client-side) ─────────────── -->
    <ClientOnly>
      <Transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="-translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="-translate-x-full"
      >
        <LazyEditorBuilderSidebar v-if="isEditMode" />
      </Transition>
    </ClientOnly>

    <!-- ── Contenu principal ─────────────────────────────────────────────── -->
    <div
      class="flex-1 min-w-0 transition-all duration-200 ease-out"
      :class="[isEditMode && viewportWidth ? 'bg-gray-100 dark:bg-slate-950' : '']"
      :style="isEditMode ? `margin-left: ${effectiveBuilderWidth}px;` : ''"
    >
      <!-- Toolbar device (mobile/tablet/desktop) — visible uniquement en edit mode -->
      <ClientOnly v-if="isEditMode">
        <LazyEditorViewportToolbar />
      </ClientOnly>

      <!-- ══ Constrained device mode: iframe with actual viewport width ══ -->
      <ClientOnly v-if="isEditMode && viewportWidth">
        <div class="mx-auto py-6 flex justify-center">
          <iframe
            :src="iframeSrc"
            :style="{ width: viewportWidth + 'px' }"
            class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl ring-1 ring-gray-200 dark:ring-slate-700 transition-all duration-300 ease-out"
            style="height: calc(100vh - 100px);"
            frameborder="0"
            title="Preview builder"
          />
        </div>
      </ClientOnly>

      <!-- ══ Mode desktop / hors edit : render direct ══ -->
      <template v-else>
        <LayoutTheHeader />
        <main :class="[isEditMode ? 'edit-mode' : '', 'pb-24 sm:pb-0']">
          <slot />
        </main>
        <LayoutPrefooterZone />
        <LayoutTheFooter />
        <MobileStickyBar />
        <DemoControlBar />
      </template>
    </div>

    <!-- ── Panier slide-in (CartDrawer) — gated par features.showCart ──── -->
    <ClientOnly>
      <LazyCartDrawer v-if="cartEnabled" />
    </ClientOnly>

    <!-- ── Quote slide-in (QuoteDrawer) — B2B unauthenticated ──── -->
    <ClientOnly>
      <LazyQuoteDrawer />
    </ClientOnly>

    <!-- ── Chatbot widget (bouton flottant + carte chat) ──────────────── -->
    <ClientOnly>
      <LazyChatbotWidget v-if="chatbotEnabled" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { deepMerge } from '~/utils/deepMerge'

const { isEditMode }     = useEditMode()
const { config, resolvedClientId } = useClientDetection()
const { header: headerDb } = useHeaderDb()

// Synchronize the margin-left of main content with the effective width
// of the Builder sidebar (drag-resize or 56px rail). Shared state via
// useBuilderGeometry — the sidebar writes to it, the layout reads from it.
const { effectiveWidth: effectiveBuilderWidth } = useBuilderGeometry()

// CartDrawer mounted = sum of sources (dbConfig OR cs_header).
// dbConfig can be incomplete if only gscSiteUrl is seeded on the tenant
// (cf. incidents 2026-04-26 : conflit cs_client_config rows example-shop/example-shop-v2).
// cs_header is the canonical source for the header — align it with the header button.
const cartEnabled = computed(() =>
  Boolean((headerDb.value as any)?.features?.showCart ?? (config.value as any)?.features?.showCart),
)

// Feature flag marketplace: chatbot. Off by default, enabled in example-shop-v2.
const { hasFeature, loadFeatures, loaded: featuresLoaded } = useFeatureFlag()
onMounted(() => { if (!featuresLoaded.value) loadFeatures() })
const chatbotEnabled = computed(() => hasFeature('chatbot'))

// Builder viewport mode (desktop / tablet / mobile)
const { currentWidth: viewportWidth, isInsideIframe } = useEditorViewport()

// URL to load in the preview iframe (same URL + flag ?builder-preview=1
// for SSR-safe detection on the child side).
const iframeSrc = ref('')
if (import.meta.client) {
  const u = new URL(window.location.href)
  u.searchParams.set('builder-preview', '1')
  iframeSrc.value = u.toString()
}

const auth               = useAuth({ forceEmployee: true })
const fetchMe            = (auth as any).fetchMe as (() => Promise<void>) | undefined
const checkSession       = (auth as any).checkSession as (() => Promise<void>) | undefined
const customerAuth       = useCustomerAuth()
const editor             = useEditorState()

// Dynamic favicon from the tenant's runtimeConfig
const { public: runtimePublic } = useRuntimeConfig()
const faviconHref = computed(() => (runtimePublic.favicon as string) || '/favicon.svg')
useHead({
  link: [{ rel: 'icon', type: 'image/svg+xml', href: faviconHref }],
})

// Hreflang alternates SEO i18n — injecte <link rel="alternate" hreflang="..."/>
// in the <head> for each active language (fr/en/de/…) + x-default. Each
// page automatically inherits alternates via the layout.
useI18nHead()

// Shared DB Config — runtime source of truth for all modes (edit + public)
// Shared useState with TheHeader/TheFooter. Populated via useFetch SSR+CSR.
const dbConfig = useState<Record<string, unknown> | null>('client_db_config', () => null)

const { data: _fetchedConfig } = await useFetch<Record<string, unknown>>(
  `/api/client-config/${resolvedClientId.value}`,
  { key: `client-config-${resolvedClientId.value}`, default: () => null },
)
if (_fetchedConfig.value) {
  dbConfig.value = _fetchedConfig.value
}

// Check sessions from setup (SSR + CSR) so that useB2bVisibility
// and useEditMode have the correct state before the first render
await customerAuth.checkSession()
if (fetchMe) await fetchMe()
else if (checkSession) await checkSession()

// Feature flags marketplace — loaded SSR so that hasFeature() is available
// from the first render (v-if without flash on gated components).
const { loadFeatures: loadMarketplaceFeatures } = useFeatureFlag()
await loadMarketplaceFeatures()

// Init editor in edit mode — DB only, zero fallback .ts
onMounted(() => {
  if (isEditMode.value && dbConfig.value) {
    editor.initFromConfig(dbConfig.value as any)
  }
})
</script>
