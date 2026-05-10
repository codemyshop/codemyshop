<!--
  Zone pré-footer — composants affichés sur toutes les pages, juste avant le footer.
  DB-driven (table cs_prefooter_section).
  Fallback : CustomerReviews hardcodé pour les tenants sans DB pré-footer.

  Live preview : le builder écrit dans useDbPrefooterSections(), ce composant le lit.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const { resolvedClientId } = useClientDetection()
const { t: i18nt } = useI18nField()

const DB_PREFOOTER_TENANTS = ['example-shop']
const isDbPrefooter = computed(() => DB_PREFOOTER_TENANTS.includes(resolvedClientId.value))

// Initial fetch from the DB (SSR-safe) — lang-aware
const { activeLang: pfLang } = useRouteLang()
const { data: pfData } = await useFetch<{ sections: any[] }>('/api/prefooter-sections', {
  query: { lang: pfLang },
  watch: [pfLang],
  default: () => ({ sections: [] }),
})

// State shared with the builder for live preview
const editorPfSections = useDbPrefooterSections()

const pfSections = computed(() => {
  // Live preview builder actif
  if (editorPfSections.value.length > 0) {
    return [...editorPfSections.value]
      .filter(s => s.active)
      .sort((a, b) => a.position - b.position)
  }
  // Data from the initial fetch
  return pfData.value?.sections?.filter((s: any) => s.active !== false) ?? []
})

const useDbMode = computed(() => isDbPrefooter.value && pfSections.value.length > 0)

/** Resolves an i18n title (raw string, JSON stringified, or raw dict) */
function resolveI18n(value: any, fallback: string = ''): string {
  if (!value) return fallback
  if (typeof value === 'object') return i18nt(value) || fallback
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null) return i18nt(parsed) || fallback
    } catch { /* string nue */ }
    return value || fallback
  }
  return fallback
}

function findPf(type: string): any {
  return pfSections.value.find((s: any) => s.type === type) ?? null
}

const reviewsSection = computed(() => {
  const s = findPf('customer-reviews')
  return s ? {
    title: resolveI18n(s.title, 'Nos clients parlent de nous'),
    limit: s.limitItems ?? 6,
  } : null
})
</script>

<template>
  <!-- DB mode: pre-footer sections from the database -->
  <template v-if="useDbMode">
    <template v-for="section in pfSections" :key="section.id">
      <LazyCustomerReviews
        v-if="section.type === 'customer-reviews'"
        :title="reviewsSection?.title ?? 'Nos clients parlent de nous'"
        :limit="reviewsSection?.limit ?? 6"
      />
    </template>
  </template>

  <!-- Fallback: hardcoded CustomerReviews -->
  <LazyCustomerReviews v-else title="Nos clients parlent de nous" />
</template>
