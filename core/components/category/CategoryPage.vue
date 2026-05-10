<!--
  CategoryPage — composant core SEO-rich pour landing catégorie par pilier.

  Extrait du pattern Example Shop v2 /grossiste/[...path] + /marque/[...path].
  Utilisable par n'importe quel tenant via <CategoryPage :pilier="..." /> depuis
  une route `pages/[pilier]/[...path].vue` avec validate route.

  Layout SEO (modèle voguimmo) :
    - Hero 2 cols : H1+intro à gauche, vignette à droite
    - Sommaire sticky droite avec highlight actif
    - Sections ancrées (#produits, #livraison, #faq, #presentation, #articles, #contact)
    - JSON-LD : BreadcrumbList + Product/AggregateOffer + ItemList + FAQPage
    - Pagination SSR dans CategoryProductGrid (PAS d'infinite scroll)

  Fallback produit : si la catégorie n'existe pas et que le dernier segment est
  un slug produit valide → rendu ProductDetail.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
interface Props {
  pilier: string
  // Segments override : permet au catch-all core/pages/[...path].vue de passer
  // Segments without the prefixed silo (e.g., /grossiste/fruit-sec/datte →
  // segments=['fruit-sec','datte'], silo='grossiste'). If absent, reads
  // route.params.path directement (mode wrapper tenant historique).
  initialSegments?: string[]
}
const props = defineProps<Props>()

const { localePath } = useLocalePath()
const { t } = useT()
const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const brandName = String((_cfg.public as any).brandName ?? '')
const psFrontUrl = String((_cfg.public as any).psFrontUrl ?? '')
const route = useRoute()
const { isEditMode } = useEditMode()
const { registerContext, clearContext } = useEditorContext()

const segments = computed<string[]>(() => {
  if (props.initialSegments !== undefined) {
    return props.initialSegments.filter(Boolean) as string[]
  }
  const raw = route.params.path
  const arr = Array.isArray(raw) ? raw : (raw ? [raw] : [])
  return arr.filter(Boolean) as string[]
})

const pathParam = computed(() => segments.value.join('/'))

interface CategoryChild { id: number; slug: string; path: string; label: string }
interface CategoryFaqItem { position: number; question: string; answer_html: string }
interface CategoryAggregate { total: number; price_min: number | null; price_max: number | null }
interface CategoryResponse {
  found: boolean
  kind: 'pilier' | 'category'
  pilier: string
  id_category: number | null
  id_parent: number | null
  level_depth: number
  path: string
  slug: string
  name: string
  h1: string
  meta_title: string
  meta_description: string
  intro_html: string | null
  long_description_html: string | null
  image_url: string | null
  breadcrumb: Array<{ label: string; path: string }>
  children: CategoryChild[]
  aggregate: CategoryAggregate
  faq: CategoryFaqItem[]
}

const { activeLang: siloLang } = useRouteLang()
const { data: category, error } = await useFetch<CategoryResponse>('/api/category', {
  query: { path: pathParam, pilier: props.pilier, lang: siloLang },
  key: () => `category-${props.pilier}-${pathParam.value}-${siloLang.value}`,
  watch: [siloLang],
})

// Fallback product slug if the category doesn't exist.
interface ProductBySlugResponse {
  found: boolean
  id_product?: number
  name?: string
  pilier?: string
  breadcrumb?: Array<{ label: string; path: string; slug: string }>
}
const isProductPage = ref(false)
const productId = ref<number | null>(null)
const productBreadcrumb = ref<Array<{ label: string; path: string }>>([])
const productPilier = ref<string>('')

if (error.value || !category.value?.found) {
  const lastSegment = segments.value[segments.value.length - 1]
  // segments >= 1 (not >=2): covers the case where id_category_default points
  // to the silo itself (138 products Example Shop) → URL `/grossiste/{slug}-{id}`
  // with a unique segment. /api/product-by-slug ignores siloPath (PS guarantees
  // uniqueness via link_rewrite) so empty parentPath is safe.
  if (lastSegment && segments.value.length >= 1) {
    const parentPath = segments.value.slice(0, -1).join('/')
    const { data: productLookup } = await useFetch<ProductBySlugResponse>('/api/product-by-slug', {
      query: { slug: lastSegment, siloPath: parentPath, lang: siloLang },
      key: () => `product-slug-${parentPath}-${lastSegment}-${siloLang.value}`,
      watch: [siloLang],
    })
    if (productLookup.value?.found && productLookup.value.id_product) {
      isProductPage.value = true
      productId.value = productLookup.value.id_product
      productBreadcrumb.value = productLookup.value.breadcrumb ?? []
      productPilier.value = productLookup.value.pilier ?? props.pilier

      // 301 redirect to short canonical URL if user arrives via an old
      // deep indexed URL (e.g., /grossiste/racine/accueil/marque/espig/{slug}
      // → /grossiste/{leaf}/{slug}). Preserves SEO value without breaking
      // backlinks. Refacto URL flat 2026-04-25.
      const { data: canonical } = await useFetch<{ found: boolean; path?: string }>('/api/product-url-by-id', {
        query: { id: productLookup.value.id_product, lang: siloLang },
        key: () => `product-canonical-${productLookup.value!.id_product}-${siloLang.value}`,
        watch: [siloLang],
      })
      const canonicalPath = canonical.value?.path
      if (canonicalPath && canonicalPath !== route.path) {
        await navigateTo(canonicalPath, { redirectCode: 301 })
      }
    } else {
      throw createError({ statusCode: 404, statusMessage: 'Catégorie introuvable', fatal: true })
    }
  } else {
    throw createError({ statusCode: 404, statusMessage: 'Catégorie introuvable', fatal: true })
  }
}

// Fiche produit.
const { data: productData } = isProductPage.value && productId.value
  ? await useFetch(`/api/catalogue/product/${productId.value}`, {
      query: { clientId, lang: siloLang },
      key: () => `product-${productId.value}-${siloLang.value}`,
      watch: [siloLang],
    })
  : { data: ref(null) }

const product = computed(() => {
  const raw = productData.value
  return (raw as any)?.product ?? raw ?? null
})

// productBreadcrumb comes from /api/product-by-slug (ancestor chain DB-Only
// depuis ps_product.id_category_default). Cf ref() au-dessus.

const canonicalBase = psFrontUrl
const canonicalPath = computed(() => {
  if (isProductPage.value) {
    return `/${props.pilier}/${pathParam.value}`
  }
  return `/${props.pilier}${category.value?.path ? '/' + category.value.path : ''}/`
})
const canonicalUrl = computed(() => `${canonicalBase}${canonicalPath.value}`)

const currentPage = computed(() => {
  const raw = Number(route.query.page)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})
const isFirstPage = computed(() => currentPage.value === 1)

if (isProductPage.value) {
  useHead(() => ({
    title: product.value ? `${product.value.name} — ${brandName}` : `Produit — ${brandName}`,
    meta: [
      { name: 'description', content: product.value?.description_short?.slice(0, 160) ?? '' },
      { property: 'og:title', content: product.value?.name ?? brandName },
      { property: 'og:description', content: product.value?.description_short?.slice(0, 160) ?? '' },
      { property: 'og:image', content: product.value?.images?.[0] ?? '' },
      { property: 'og:type', content: 'product' },
      { property: 'og:url', content: canonicalUrl.value },
    ],
    link: [{ rel: 'canonical', href: canonicalUrl.value }],
    script: product.value ? [{
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.value.name,
        description: product.value.description_short,
        image: product.value.images?.[0],
        sku: product.value.reference,
        offers: {
          '@type': 'Offer',
          price: product.value.priceRaw,
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
        },
      }),
    }] : [],
  }))
  useListingBodyId('product', () => productId.value)
} else {
  useCategoryBodyId(() => category.value?.id_category ?? null)
}

const jsonLdBreadcrumb = computed(() => {
  if (isProductPage.value || !category.value) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: category.value.breadcrumb.map((bc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: bc.label,
      item: `${canonicalBase}/${props.pilier}${bc.path ? '/' + bc.path : ''}/`,
    })),
  }
})

const jsonLdProduct = computed(() => {
  if (isProductPage.value || !category.value) return null
  const agg = category.value.aggregate
  if (!agg || agg.total === 0 || agg.price_min === null || agg.price_max === null) {
    return null
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: category.value.name,
    description: category.value.meta_description,
    brand: { '@type': 'Brand', name: brandName },
    ...(category.value.image_url
      ? { image: `${canonicalBase}${category.value.image_url}` }
      : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: agg.price_min.toFixed(2),
      highPrice: agg.price_max.toFixed(2),
      offerCount: agg.total,
      availability: 'https://schema.org/InStock',
    },
  }
})

const jsonLdItemList = computed(() => {
  if (isProductPage.value || !category.value) return null
  if (!category.value.children || category.value.children.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category.value.name,
    itemListElement: category.value.children.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      url: `${canonicalBase}/${props.pilier}/${c.path}/`,
    })),
  }
})

// CollectionPage: numberOfItems = aggregate.total (calculated in SSR via
// /api/category, therefore reliable unlike useLazyFetch on grid side).
const jsonLdCollectionPage = computed(() => {
  if (isProductPage.value || !category.value) return null
  const total = category.value.aggregate?.total ?? 0
  if (total <= 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.value.name,
    description: category.value.meta_description || '',
    url: canonicalUrl.value,
    numberOfItems: total,
    isPartOf: { '@type': 'WebSite', name: brandName, url: canonicalBase },
  }
})

// FAQPage: injected via useHead (not Teleport, which fails on SSR under v-if
// profond — cf audit /grossiste/epice 2026-04-25).
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}
const jsonLdFaq = computed(() => {
  if (isProductPage.value || !category.value) return null
  const items = category.value.faq ?? []
  if (items.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: stripHtml(item.answer_html) },
      })),
  }
})

// Aggregate of 5 JSON-LD for useHead. We only keep those with
// content — schema.org expects non-null objects.
const jsonLdScripts = computed(() => {
  const blobs = [
    { key: 'jsonld-breadcrumb', data: jsonLdBreadcrumb.value },
    { key: 'jsonld-collectionpage', data: jsonLdCollectionPage.value },
    { key: 'jsonld-product', data: jsonLdProduct.value },
    { key: 'jsonld-itemlist', data: jsonLdItemList.value },
    { key: 'jsonld-faq', data: jsonLdFaq.value },
  ]
  return blobs
    .filter(b => b.data !== null)
    .map(b => ({
      key: b.key,
      type: 'application/ld+json',
      innerHTML: JSON.stringify(b.data),
    }))
})

if (!isProductPage.value) {
  useHead(() => {
    const paginated = !isFirstPage.value
    return {
      title: category.value?.meta_title ?? brandName,
      meta: [
        { name: 'description', content: category.value?.meta_description ?? '' },
        ...(paginated ? [{ name: 'robots', content: 'noindex, follow' }] : []),
        { property: 'og:title', content: category.value?.meta_title ?? '' },
        { property: 'og:description', content: category.value?.meta_description ?? '' },
        { property: 'og:url', content: canonicalUrl.value },
        { property: 'og:type', content: 'website' },
        ...(category.value?.image_url
          ? [{ property: 'og:image', content: `${canonicalBase}${category.value.image_url}` }]
          : []),
      ],
      link: [{ rel: 'canonical', href: canonicalUrl.value }],
      script: jsonLdScripts.value,
    }
  })
}

const hasProducts = computed(
  () => !!category.value && (category.value.aggregate?.total ?? 0) > 0,
)
const hasFaq = computed(() => (category.value?.faq?.length ?? 0) > 0)
const hasCategoryDescription = computed(() => !!category.value?.long_description_html)
// Count of related blog articles (same endpoint as CategoryArticleCarousel,
// useFetch deduplicated via shared key → 1 single SSR call).
const articlesCountQuery = computed(() => ({
  categoryId: category.value?.id_category ?? 0,
  limit: 1,
  lang: siloLang.value,
}))
const { data: articlesCountData } = await useFetch<{ total: number }>('/api/catalogue/articles', {
  query: articlesCountQuery,
  key: () => `articles-cat-${category.value?.id_category ?? 0}-${siloLang.value}`,
  immediate: !!category.value?.id_category,
  watch: [articlesCountQuery],
})
const hasCategoryArticles = computed(
  () => !!category.value?.id_category && (articlesCountData.value?.total ?? 0) > 0,
)

const subcategoryPills = computed(() =>
  (category.value?.children ?? []).map(c => ({
    label: c.label,
    // For cross-categories, c.silo is populated with the origin silo
    // (potentially ≠ host silo). For native children, fallback to
    // the silo of the current page.
    url: `/${(c as any).pilier || props.pilier}/${c.path}/`,
  })),
)

const gridQuery = computed<Record<string, string | number>>(() => {
  const q: Record<string, string | number> = { pilier: props.pilier }
  const id = category.value?.id_category
  if (id) q.id_category = id
  const o = String(route.query.origin ?? '').trim()
  const a = String(route.query.allergens ?? '').trim()
  if (o) q.origin = o
  if (a) q.allergens = a
  return q
})

interface TocItem { id: string; label: string }
const tocItems = computed<TocItem[]>(() => {
  const out: TocItem[] = []
  if (hasProducts.value) out.push({ id: 'produits', label: t('silo.toc_products') })
  out.push({ id: 'livraison', label: t('silo.toc_shipping') })
  if (hasFaq.value) out.push({ id: 'faq', label: t('silo.toc_faq') })
  if (hasCategoryDescription.value) out.push({ id: 'presentation', label: t('silo.toc_presentation') })
  if (hasCategoryArticles.value) out.push({ id: 'articles', label: t('silo.toc_articles') })
  return out
})

// Intro fallback: i18n key `silo.intro_fallback_{silo}_root` (silo landing)
// and `silo.intro_fallback_{silo}_template` (subcategories). If the key
// doesn't exist, useHubT returns the default provided as 2nd argument.
// useT returns the key itself when missing: cascading behavior
// Pillar-specific → generic → empty, filtering unresolved keys
function resolveSiloT(key: string): string {
  const v = t(key)
  return v === key || v.startsWith('silo.intro_fallback_') ? '' : v
}
const fallbackIntro = computed(() => {
  if (category.value?.kind === 'pilier') {
    return resolveSiloT(`silo.intro_fallback_${props.pilier}_root`)
        || resolveSiloT('silo.intro_fallback_root')
  }
  const tpl = resolveSiloT(`silo.intro_fallback_${props.pilier}_template`)
           || resolveSiloT('silo.intro_fallback_template')
           || '${label}'
  return tpl.replace('${label}', category.value?.name.toLowerCase() ?? '')
})

// Edit Mode
const editorSilo = useEditorSilo()

onMounted(() => {
  if (category.value) {
    registerContext('silo', {
      path: category.value.path,
      slug: category.value.slug,
      label: category.value.name,
      id_silo: category.value.id_category,
      level: category.value.level_depth,
      kind: category.value.kind,
    })
    editorSilo.value = {
      h1: category.value.h1,
      intro_html: category.value.intro_html,
      image_path: category.value.image_url,
      image_alt: category.value.name,
      meta_title: category.value.meta_title,
      meta_description: category.value.meta_description,
      id_category: category.value.id_category,
      slug: category.value.slug,
    }
  }
})
onUnmounted(() => clearContext())

const liveH1 = computed(() =>
  isEditMode.value && editorSilo.value.h1 ? editorSilo.value.h1 : category.value?.h1,
)
const liveIntroHtml = computed(() =>
  isEditMode.value && editorSilo.value.intro_html ? editorSilo.value.intro_html : category.value?.intro_html,
)
const liveImagePath = computed(() =>
  isEditMode.value && editorSilo.value.image_path ? editorSilo.value.image_path : category.value?.image_url,
)
const liveImageAlt = computed(() =>
  isEditMode.value && editorSilo.value.image_alt ? editorSilo.value.image_alt : category.value?.name,
)
</script>

<template>
  <NuxtLayout name="white-label">
    <!-- ═══ FICHE PRODUIT ═══ -->
    <div v-if="isProductPage">
      <ProductDetail
        v-if="product"
        :product="(product as any)"
        :breadcrumb="productBreadcrumb"
        :pilier="productPilier || props.pilier"
      />
      <div v-else class="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">{{ t('silo.silo_not_found') }}</h1>
        <NuxtLink to="/" class="text-primary-600 hover:underline">{{ t('silo.silo_back_home') }}</NuxtLink>
      </div>
    </div>

    <!-- ═══ CATEGORY LANDING ═══ -->
    <!-- JSON-LD (Breadcrumb, CollectionPage, AggregateOffer, ItemList,
         FAQPage) : injecté via useHead côté script (SSR-safe) — pas de
         Teleport ici qui rate sous v-if profond en SSR Nuxt 3. -->
    <template v-else>
    <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <!-- Breadcrumb -->
      <nav class="mb-6 text-sm" :aria-label="t('silo.breadcrumb_aria')">
        <ol class="flex flex-wrap items-center gap-2 text-slate-500">
          <li>
            <NuxtLink :to="localePath('/')" class="hover:text-emerald-700">{{ t('silo.breadcrumb_home') }}</NuxtLink>
          </li>
          <li v-for="(bc, i) in category!.breadcrumb" :key="i" class="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <NuxtLink
              :to="localePath(`/${props.pilier}${bc.path ? '/' + bc.path : ''}/`)"
              :class="[
                i === category!.breadcrumb.length - 1
                  ? 'font-semibold text-emerald-800'
                  : 'hover:text-emerald-700',
              ]"
            >
              {{ bc.label }}
            </NuxtLink>
          </li>
        </ol>
      </nav>

      <!-- Hero page-1-only -->
      <CategoryHero
        v-if="isFirstPage"
        :h1="liveH1 ?? category!.h1"
        :intro-html="liveIntroHtml ?? category!.intro_html"
        :image-path="liveImagePath ?? category!.image_url"
        :image-alt="liveImageAlt ?? category!.name"
        :image-webp-srcset="(category as any)?.image_webp_srcset ?? null"
        :image-sizes="(category as any)?.image_sizes ?? null"
        :label="category!.name"
        :fallback-intro="fallbackIntro"
        :subcategories="subcategoryPills"
        class="mb-12"
      />

      <div
        class="grid grid-cols-1 gap-10"
        :class="isFirstPage ? 'lg:grid-cols-[1fr_260px]' : ''"
      >
        <article class="space-y-14">
          <!-- §1 Produits -->
          <section v-if="hasProducts" id="produits" class="scroll-mt-24">
            <div class="grid grid-cols-1 gap-6">
              <CategoryProductGrid
                :key="`cat-${category!.id_category}-p${$route.query.page || 1}-o${$route.query.origin || ''}-a${$route.query.allergens || ''}`"
                endpoint="/api/catalogue/by-category"
                :query="gridQuery"
                :canonical-path="canonicalPath"
                :canonical-base="canonicalBase"
                :key-prefix="`cat-${category!.id_category}`"
                :limit="24"
                :interleave-every="16"
                interleave-on-top
              >
                <template #interleave>
                  <CategoryRdvCard variant="flat" />
                </template>
              </CategoryProductGrid>
            </div>
          </section>

          <!-- §2 Livraison & B2B (page-1-only) -->
          <section v-if="isFirstPage" id="livraison" class="scroll-mt-24">
            <h2 class="mb-5 text-2xl font-bold tracking-tight text-primary-900 dark:text-primary-100">
              {{ t('silo.shipping_title') }}
            </h2>
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p class="text-sm font-semibold text-primary-800 dark:text-primary-300">{{ t('silo.shipping_rungis') }}</p>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-400" v-html="t('silo.shipping_rungis_detail').replace(/\\n/g, '<br>')"></p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p class="text-sm font-semibold text-primary-800 dark:text-primary-300">{{ t('silo.shipping_bordeaux') }}</p>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-400" v-html="t('silo.shipping_bordeaux_detail').replace(/\\n/g, '<br>')"></p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p class="text-sm font-semibold text-primary-800 dark:text-primary-300">{{ t('silo.shipping_packaging') }}</p>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{{ t('silo.shipping_packaging_detail') }}</p>
              </div>
            </div>
          </section>

          <!-- §3 FAQ (page-1-only, JSON-LD FAQPage) -->
          <section v-if="hasFaq && isFirstPage" id="faq" class="scroll-mt-24">
            <CategoryFaq :items="category!.faq" />
          </section>

          <!-- §4 Presentation (page-1-only) -->
          <section v-if="hasCategoryDescription && isFirstPage" id="presentation" class="scroll-mt-24">
            <h2 class="mb-5 text-2xl font-bold tracking-tight text-primary-900 dark:text-primary-100">
              {{ t('silo.presentation_title') }}
            </h2>
            <div
              class="max-w-3xl text-slate-700 dark:text-slate-300
                     [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900 dark:[&_h2]:text-slate-100 [&_h2]:mt-10 [&_h2]:mb-3
                     [&_h2:first-child]:mt-0
                     [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-800 dark:[&_h3]:text-slate-200 [&_h3]:mt-6 [&_h3]:mb-2
                     [&_p]:mb-5 [&_p]:leading-relaxed
                     [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white
                     [&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:font-medium [&_a]:no-underline hover:[&_a]:underline
                     [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul]:space-y-1.5
                     [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_ol]:space-y-1.5
                     [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
                     [&_thead]:bg-slate-50 dark:[&_thead]:bg-slate-800
                     [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-slate-200 dark:[&_th]:border-slate-700
                     [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-700 [&_td]:align-top
                     [&_tbody_tr:nth-child(even)]:bg-slate-50/50 dark:[&_tbody_tr:nth-child(even)]:bg-slate-800/30"
              v-html="category!.long_description_html"
            />
          </section>

          <!-- §5 Related blog articles (page-1-only) -->
          <section v-if="hasCategoryArticles && isFirstPage" id="articles" class="scroll-mt-24">
            <CategoryArticleCarousel
              endpoint="/api/catalogue/articles"
              :query="{ categoryId: category!.id_category!, limit: 8 }"
              :key-prefix="`articles-cat-${category!.id_category}`"
              :title="t('silo.articles_title')"
            />
          </section>

        </article>

        <!-- Sommaire sticky droite (page-1-only) -->
        <CategoryToc v-if="isFirstPage" :items="tocItems" />
      </div>
    </div>
    </template>
  </NuxtLayout>
</template>
