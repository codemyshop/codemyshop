<!--
  CmsPage — render unifié d'une page CMS PrestaShop (tenant-neutre).

  Contrat : reçoit les données CMS chargées + footer contact via props.
  Pas de useFetch interne — les consumers (ex: [...path].vue catch-all)
  chargent déjà la donnée pour arbitrer cat vs CMS.

  Layout landing premium : breadcrumb + hero (h1 + lede) + contenu nettoyé
  via cleanLegacyCmsHtml + CTA contact (email/tel/contact) issu de
  cs_footer_config. JSON-LD WebPage.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
interface CmsPageData {
  id?: number
  title?: string
  content?: string
  meta_description?: string
}
interface FooterContact {
  email?: string
  phone?: string
}

const props = defineProps<{
  page: CmsPageData
  contact: FooterContact | null
  canonicalUrl: string
  activeLang: string
}>()

const { t } = useT()
const _cfg = useRuntimeConfig()
const brand = String((_cfg.public as any).brandName ?? '')
const psFrontUrl = String((_cfg.public as any).psFrontUrl ?? '')
const { localePath } = useLocalePath()

const cleanContent = computed(() => cleanLegacyCmsHtml(props.page?.content ?? ''))
const lede = computed(() => props.page?.meta_description?.trim() || '')

// Convention PS : <body id="cms" class="cms cms-id-{X}">
useListingBodyId('cms', () => props.page?.id ?? null)

useHead({
  title: computed(() => {
    const suffix = brand ? ` — ${brand}` : ''
    return props.page ? `${props.page.title}${suffix}` : (brand || '')
  }),
  meta: [
    { name: 'description', content: lede },
    { property: 'og:title', content: computed(() => props.page?.title ?? '') },
    { property: 'og:description', content: lede },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: props.canonicalUrl },
  ],
  link: [{ rel: 'canonical', href: props.canonicalUrl }],
  script: [{
    type: 'application/ld+json',
    innerHTML: computed(() => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: props.page?.title,
      description: lede.value,
      url: props.canonicalUrl,
      isPartOf: { '@type': 'WebSite', name: brand, url: psFrontUrl },
      inLanguage: props.activeLang,
    })),
  }],
})
</script>

<template>
  <article class="bg-white">

    <!-- Hero : breadcrumb + titre + lede -->
    <header class="border-b border-gray-100">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-12 sm:pt-12 sm:pb-16">
        <nav class="text-xs text-gray-400 mb-6" :aria-label="t('silo.breadcrumb_aria')">
          <NuxtLink :to="localePath('/')" class="hover:text-primary-600 transition-colors">
            {{ t('silo.breadcrumb_home') }}
          </NuxtLink>
          <span class="mx-1.5">/</span>
          <span class="text-gray-700 font-medium">{{ page?.title }}</span>
        </nav>

        <h1 class="text-3xl sm:text-4xl font-light text-gray-900 tracking-tight mb-4">
          {{ page?.title }}
        </h1>
        <p v-if="lede" class="text-lg text-gray-500 leading-relaxed max-w-2xl">
          {{ lede }}
        </p>
      </div>
    </header>

    <!-- Cleaned content -->
    <section class="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div
        class="prose prose-lg max-w-none
               prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:tracking-tight
               prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-100
               prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
               prose-p:text-gray-700 prose-p:leading-relaxed
               prose-a:text-primary-700 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
               prose-strong:text-gray-900 prose-strong:font-semibold
               prose-ul:my-4 prose-li:text-gray-700"
        v-html="cleanContent"
      />
    </section>

    <!-- CTA Contact -->
    <section v-if="contact?.email || contact?.phone" class="border-t border-gray-100 bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div class="text-center">
          <h2 class="text-2xl font-light text-gray-900 tracking-tight mb-2">
            {{ t('cms.contact_question_title') }}
          </h2>
          <p class="text-gray-500 mb-8">
            {{ t('cms.contact_question_lede') }}
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <a
              v-if="contact?.email"
              :href="`mailto:${contact.email}`"
              class="inline-flex items-center gap-2 px-5 h-11 bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {{ contact.email }}
            </a>
            <a
              v-if="contact?.phone"
              :href="`tel:${String(contact.phone).replace(/[\s.-]/g, '')}`"
              class="inline-flex items-center gap-2 px-5 h-11 bg-white border border-gray-200 hover:border-primary-400 hover:text-primary-700 text-gray-900 text-sm font-semibold rounded-lg transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h2.5a1 1 0 01.97.757l1.2 4.8a1 1 0 01-.27.95l-1.6 1.6a11 11 0 005.6 5.6l1.6-1.6a1 1 0 01.95-.27l4.8 1.2a1 1 0 01.757.97V19a2 2 0 01-2 2h-1C8.954 21 3 15.046 3 8V5z" /></svg>
              {{ contact.phone }}
            </a>
            <NuxtLink
              :to="localePath('/contact')"
              class="inline-flex items-center gap-2 px-5 h-11 bg-white border border-gray-200 hover:border-primary-400 hover:text-primary-700 text-gray-900 text-sm font-semibold rounded-lg transition-colors"
            >
              {{ t('cms.contact_form_cta') }}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

  </article>
</template>
