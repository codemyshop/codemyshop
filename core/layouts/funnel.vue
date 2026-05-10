<!--
  Layout dédié funnel B2B pré-vente — /devis + /rdv.
  Header minimal (logo centré), pas de megamenu/drawer/widget.
  Footer minimal (mentions légales + copyright). Aucune distraction.

  Différence avec checkout.vue : pas d'indicateur "Paiement sécurisé"
  (pas pertinent en pré-vente — pas de transaction). Indicateur
  optionnel "Confidentiel" pour rassurer côté B2B (SIRET, données
  entreprise saisies).

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
    <!-- Minimal header — centered logo, privacy indicator on the right -->
    <header class="border-b border-gray-100 dark:border-slate-800">
      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-center">
        <NuxtLink to="/" class="flex items-center gap-2 shrink-0" :aria-label="t('common.common_back_to_home', 'Retour à l\'accueil')">
          <NuxtImg
            v-if="logoSrc"
            :src="logoSrc"
            :alt="logoAlt"
            class="h-10 sm:h-12 w-auto max-w-[160px] sm:max-w-[200px] object-contain"
            width="200"
            height="56"
            preset="logo"
            sizes="160px sm:200px"
            loading="eager"
            fetchpriority="high"
            data-no-filter
          />
          <AppLogo v-else :size="40" />
        </NuxtLink>
        <div class="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-slate-300">
          <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <span class="hidden sm:inline font-medium">{{ t('funnel.confidential', 'Confidentiel') }}</span>
        </div>
      </div>
    </header>

    <!-- Contenu page -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer minimal -->
    <footer class="border-t border-gray-100 dark:border-slate-800 mt-auto">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500 dark:text-slate-400">
        <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 order-2 sm:order-1">
          <span>© {{ year }} {{ brandName }}</span>
          <NuxtLink
            v-for="link in legalLinks"
            :key="link.href"
            :to="link.href"
            class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {{ link.label }}
          </NuxtLink>
        </div>
        <div class="flex items-center gap-2 order-1 sm:order-2 text-[10px] text-gray-400 dark:text-slate-500">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>{{ t('funnel.reply_sla', 'Réponse sous 24-48h ouvrées') }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { header } = useHeaderDb()
const { footer } = useFooterDb()
const { t: i18nt } = useI18nField()
const { t } = useHubT()
const { public: runtimePublic } = useRuntimeConfig()

const brandName = computed(() => String((runtimePublic as any).brandName ?? ''))
const year = new Date().getFullYear()

const logoSrc = computed(() => header.value?.logo?.src || null)
const logoAlt = computed(
  () => i18nt(header.value?.logo?.alt) || i18nt(header.value?.logo?.text) || brandName.value || 'Logo',
)

// Legal links: reuses bottomBar.links from the DB footer (consistent with
// checkout.vue + full footer). No links if DB is empty.
const legalLinks = computed<Array<{ href: string; label: string }>>(() => {
  const raw = (footer.value as any)?.bottomBar?.links as any[] | undefined
  if (!Array.isArray(raw) || !raw.length) return []
  return raw
    .filter((l) => l && typeof l.href === 'string' && l.href.length > 0)
    .map((l) => ({ href: String(l.href), label: i18nt(l.label) || String(l.href) }))
})

const faviconHref = computed(() => (runtimePublic.favicon as string) || '/favicon.svg')
useHead({
  link: [{ rel: 'icon', type: 'image/svg+xml', href: faviconHref }],
})
</script>
