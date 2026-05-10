<!--
  Homepage unifiée — tenant-neutre.

  Structure : 100% data-driven depuis cs_homepage_section (DB PS natif,
  scopé par id_shop côté serveur). Chaque tenant a ses propres sections en DB,
  même code.

  Paramètres tenant via runtimeConfig.public (nuxt.config.ts du client) :
    - brandName              (nom marque — title, Organization, h1)
    - psFrontUrl             (url site, url logo, base JSON-LD)
    - contactEmail           (Organization.email)
    - contactPhone           (Organization.telephone, optionnel)
    - contactDescription     (Organization.description, meta description)
    - socialLinks            (Organization.sameAs, array URLs)
    - logoPath               (chemin logo — défaut /logo.svg)
    - localBusiness          (PostalAddress + openingHours, optionnel — null = pas de JSON-LD LocalBusiness)
    - metaTitle              (title HTML, défaut `${brandName} — ${description tronquée}`)
    - heroH1                 (h1 sr-only SEO, défaut brandName)

  Les autres tenants (AC hub, codemyshop, corbie) qui ont une homepage custom
  non DB-driven gardent leur override clients/<tenant>/pages/index.vue.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()
const { t: i18nt } = useI18nField()

const _cfg = useRuntimeConfig()
const pub = _cfg.public as Record<string, any>

const brandName = String(pub.brandName ?? '')
const siteUrl = String(pub.psFrontUrl ?? '')
const contactEmail = String(pub.contactEmail ?? '')
const contactPhone = String(pub.contactPhone ?? '')
const contactDescription = String(pub.contactDescription ?? '')
const socialLinks = Array.isArray(pub.socialLinks) ? pub.socialLinks : []
const logoPath = String(pub.logoPath ?? '/logo.svg')
const localBusiness = pub.localBusiness ?? null
const metaTitle = String(pub.metaTitle ?? (brandName ? `${brandName} — ${contactDescription.slice(0, 80)}` : ''))
const heroH1 = String(pub.heroH1 ?? brandName)

// Sections from DB — lang-aware, tenant-scoped on server side.
const { activeLang: sectionsLang } = useRouteLang()
const { data: sectionsData } = await useFetch<{ sections: Array<{ id: number; position: number; type: string; title: string | null; subtitle: string | null; payload: any; active: boolean }> }>('/api/homepage-sections', {
  query: { lang: sectionsLang },
  watch: [sectionsLang],
  default: () => ({ sections: [] }),
})

// Builder sidebar written in shared useState → live preview in real time.
const editorDbSections = useDbHomepageSections()

const dbSections = computed(() => {
  if (editorDbSections.value.length > 0) {
    return [...editorDbSections.value]
      .filter(s => s.active)
      .sort((a, b) => a.position - b.position)
  }
  return sectionsData.value?.sections?.filter(s => s.active !== false) ?? []
})

function findDb(type: string): any {
  return dbSections.value.find(s => s.type === type) ?? null
}

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

const heroSection = computed(() => {
  const s = findDb('hero')
  return s ? { ...s.payload, title: resolveI18n(s.title, s.payload?.title), subtitle: resolveI18n(s.subtitle, s.payload?.subtitle) } : null
})
const iframeSection = computed(() => {
  const s = findDb('iframe-embed')
  if (!s) return null
  return { src: s.payload?.src, height: s.payload?.height, title: s.payload?.title }
})
const heroSliderSection = computed(() => {
  const s = findDb('hero-slider')
  return s ? { ...s, title: resolveI18n(s.title), subtitle: resolveI18n(s.subtitle) } : null
})
const promotionsSection = computed(() => {
  const s = findDb('promotions')
  return s ? { ...s, title: resolveI18n(s.title, t('home.home_promotions')), subtitle: resolveI18n(s.subtitle) } : null
})
const bestsellersSection = computed(() => {
  const s = findDb('bestsellers')
  return s ? { ...s, title: resolveI18n(s.title, t('home.home_bestsellers')), subtitle: resolveI18n(s.subtitle) } : null
})
const narrativeSection = computed(() => {
  const s = findDb('narrative-blocks')
  return s ? { ...s, title: resolveI18n(s.title), subtitle: resolveI18n(s.subtitle) } : null
})
const bannersSection = computed(() => {
  const s = findDb('banners')
  return s ? { ...s, title: resolveI18n(s.title), subtitle: resolveI18n(s.subtitle) } : null
})
const brandStripSection = computed(() => {
  const s = findDb('brand-strip')
  return s ? { ...s, title: resolveI18n(s.title), subtitle: resolveI18n(s.subtitle) } : null
})
const featuresSection = computed(() => {
  const s = findDb('features')
  return s?.payload?.items ?? []
})
const categoriesSection = computed(() => {
  const s = findDb('categories')
  return { items: s?.payload?.items ?? [], title: resolveI18n(s?.title, t('home.home_categories')) }
})
const blogSection = computed(() => {
  const s = findDb('blog')
  return s ? { ...s, title: resolveI18n(s.title, t('home.home_blog')), subtitle: resolveI18n(s.subtitle) } : null
})
const newProductsSection = computed(() => {
  const s = findDb('new-products')
  return s ? { ...s, title: resolveI18n(s.title, t('home.home_new_products')), subtitle: resolveI18n(s.subtitle) } : null
})
const faqSection = computed(() => {
  const s = findDb('faq')
  return s ? { ...s, title: resolveI18n(s.title, t('home.home_faq')), subtitle: resolveI18n(s.subtitle) } : null
})
const showNewProducts = computed(() => !!findDb('new-products'))
const showInstagram = computed(() => !!findDb('instagram'))
const giftcardSection = computed(() => {
  const s = findDb('giftcard-promo')
  return s ? { ...s, title: resolveI18n(s.title), subtitle: resolveI18n(s.subtitle) } : null
})

const orderedSectionTypes = computed<string[]>(() =>
  [...dbSections.value].sort((a, b) => a.position - b.position).map(s => s.type),
)

// JSON-LD Schema.org construit dynamiquement depuis runtimeConfig.
const organizationLd: Record<string, unknown> = {
  '@type': 'Organization',
  '@id': `${siteUrl}#organization`,
  name: brandName,
  url: siteUrl,
  logo: `${siteUrl}${logoPath}`,
  ...(contactEmail ? { email: contactEmail } : {}),
  ...(contactPhone ? { telephone: contactPhone } : {}),
  ...(contactDescription ? { description: contactDescription } : {}),
  ...(socialLinks.length ? { sameAs: socialLinks } : {}),
}

const websiteLd = {
  '@type': 'WebSite',
  '@id': `${siteUrl}#website`,
  url: siteUrl,
  name: brandName,
  publisher: { '@id': `${siteUrl}#organization` },
  inLanguage: 'fr-FR',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/recherche?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

const graph: unknown[] = [organizationLd, websiteLd]

// LocalBusiness optional (tenant with physical store + hours).
if (localBusiness && typeof localBusiness === 'object') {
  graph.push({
    '@type': 'LocalBusiness',
    '@id': `${siteUrl}#localbusiness`,
    name: brandName,
    url: siteUrl,
    image: `${siteUrl}${logoPath}`,
    ...(contactPhone ? { telephone: contactPhone } : {}),
    ...(contactEmail ? { email: contactEmail } : {}),
    priceRange: localBusiness.priceRange ?? '€€',
    ...(localBusiness.address ? { address: { '@type': 'PostalAddress', ...localBusiness.address } } : {}),
    ...(localBusiness.openingHoursSpecification ? {
      openingHoursSpecification: localBusiness.openingHoursSpecification.map((h: any) => ({ '@type': 'OpeningHoursSpecification', ...h })),
    } : {}),
  })
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': graph,
}

useHead({
  title: metaTitle,
  meta: [
    { name: 'description', content: contactDescription },
  ],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(jsonLd) },
  ],
})
</script>

<template>
  <NuxtLayout name="white-label">
    <h1 class="sr-only">{{ heroH1 }}</h1>

    <template v-for="type in orderedSectionTypes" :key="type">

      <HomeHero v-if="type === 'hero' && heroSection" :hero="heroSection" />

      <HomeIframe
        v-else-if="type === 'iframe-embed' && iframeSection?.src"
        :src="iframeSection.src"
        :height="iframeSection.height"
        :title="iframeSection.title"
      />

      <HomeHeroSlider
        v-else-if="type === 'hero-slider' && heroSliderSection"
        :payload="heroSliderSection.payload"
      />

      <HomeFeatureStrip v-else-if="type === 'features' && featuresSection.length" :features="featuresSection" />

      <HomeUniverseGrid
        v-else-if="type === 'categories' && categoriesSection.items.length"
        :categories="categoriesSection.items"
        :title="categoriesSection.title"
      />

      <HomePromotions
        v-else-if="type === 'promotions' && promotionsSection"
        :title="promotionsSection.title"
        :subtitle="promotionsSection.subtitle"
        :payload="promotionsSection.payload"
      />

      <HomeBestsellers
        v-else-if="type === 'bestsellers' && bestsellersSection"
        :title="bestsellersSection.title"
        :subtitle="bestsellersSection.subtitle"
        :payload="bestsellersSection.payload"
      />

      <HomeNarrativeBlocks
        v-else-if="type === 'narrative-blocks' && narrativeSection"
        :title="narrativeSection.title"
        :subtitle="narrativeSection.subtitle"
        :payload="narrativeSection.payload"
      />

      <HomeBanners
        v-else-if="type === 'banners' && bannersSection"
        :title="bannersSection.title"
        :subtitle="bannersSection.subtitle"
        :payload="bannersSection.payload"
      />

      <HomeNewProducts
        v-else-if="type === 'new-products' && showNewProducts"
        :title="newProductsSection?.title"
        :subtitle="newProductsSection?.subtitle"
        :payload="newProductsSection?.payload"
      />

      <HomeLatestArticles
        v-else-if="type === 'blog' && blogSection"
        :title="blogSection.title"
        :subtitle="blogSection.subtitle"
        :payload="blogSection.payload"
      />

      <HomeInstagram v-else-if="type === 'instagram' && showInstagram" />

      <HomeFaqDb
        v-else-if="type === 'faq' && faqSection"
        :title="faqSection.title"
        :subtitle="faqSection.subtitle"
        :payload="faqSection.payload"
      />

      <HomeBrandStrip
        v-else-if="type === 'brand-strip' && brandStripSection?.payload?.items?.length"
        :title="brandStripSection.title"
        :subtitle="brandStripSection.subtitle"
        :items="brandStripSection.payload.items"
      />

      <HomeGiftcard
        v-else-if="type === 'giftcard-promo' && giftcardSection"
        :title="giftcardSection.title"
        :subtitle="giftcardSection.subtitle"
      />

    </template>
  </NuxtLayout>
</template>
