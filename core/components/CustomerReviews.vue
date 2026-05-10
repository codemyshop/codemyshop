<template>
  <!-- Render if: skeleton loading, OR at least 1 individual review, OR aggregated global score available (aggregate-only mode: display just the rating + CTA to Google). -->
  <section v-if="status === 'pending' || reviews.length > 0 || hasAggregate" aria-labelledby="reviews-heading" :class="sectionClass">
    <div :class="containerClass">

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <div class="text-center mb-12">
        <span class="inline-block bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4 border border-warning-100 dark:border-warning-700/30">
          {{ t('reviews.verified_badge') }}
        </span>
        <h2
          id="reviews-heading"
          class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight"
        >
          {{ resolvedTitle }}
        </h2>

        <!-- Score global -->
        <div class="inline-flex items-center gap-3 bg-white dark:bg-white/[0.06] border border-gray-100 dark:border-white/[0.08] rounded-2xl px-5 py-3 shadow-sm">
          <div class="flex gap-0.5" role="img" :aria-label="`${t('reviews.avg_rating')} : ${aggregateRating} ${t('reviews.out_of')} 5`">
            <svg
              v-for="n in 5"
              :key="n"
              class="w-5 h-5"
              :class="n <= Math.round(aggregateRating) ? 'text-warning-400 fill-current' : 'text-gray-200 fill-current'"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div class="text-left">
            <p class="text-lg font-extrabold text-gray-900 dark:text-white leading-none">{{ aggregateRating }}<span class="text-sm font-normal text-gray-500 dark:text-slate-400"> / 5</span></p>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{{ reviewCountDisplay }} {{ t('reviews.customer_reviews') }}</p>
          </div>
        </div>
      </div>

      <!-- ── Squelettes ──────────────────────────────────────────────────── -->
      <div v-if="status === 'pending'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="n in limit" :key="n" class="bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-sm p-6 space-y-4 animate-pulse">
          <div class="flex gap-1">
            <div v-for="s in 5" :key="s" class="w-4 h-4 bg-gray-200 dark:bg-slate-700 rounded" />
          </div>
          <div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
          <div class="space-y-2">
            <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-full" />
            <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-full" />
            <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-4/5" />
            <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-2/3" />
          </div>
          <div class="pt-3 border-t border-gray-50 dark:border-white/[0.06] space-y-1">
            <div class="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
            <div class="h-2.5 bg-gray-100 dark:bg-slate-800 rounded w-1/2" />
          </div>
        </div>
      </div>

      <!-- ── Reviews grid (only if at least 1 individual review collected) -->
      <div v-else-if="reviews.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="(review, i) in reviews"
          :key="i"
          class="flex flex-col bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-sm hover:shadow-md dark:hover:shadow-white/5 transition-shadow duration-200 p-6"
          :aria-label="`${t('reviews.review_by')} ${review.author}`"
        >
          <!-- Stars -->
          <div class="flex items-center gap-1 mb-4" role="img" :aria-label="`${review.rating} ${t('reviews.stars_out_of_5')}`">
            <svg
              v-for="n in 5"
              :key="n"
              class="w-4 h-4 shrink-0"
              :class="n <= review.rating ? 'text-warning-400 fill-current' : 'text-gray-200 fill-current'"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span class="ml-1 text-xs text-gray-500 dark:text-slate-400">{{ review.date ? formatDate(review.date) : '' }}</span>
          </div>

          <!-- Titre de l'avis -->
          <h3
            v-if="review.title"
            class="text-sm font-bold text-gray-900 dark:text-white mb-2 leading-snug"
          >
            {{ review.title }}
          </h3>

          <!-- Corps de l'avis -->
          <p class="text-sm text-gray-600 dark:text-slate-400 leading-relaxed line-clamp-4 flex-1">
            {{ review.text }}
          </p>

          <!-- Pied de carte : auteur + entreprise + source -->
          <footer class="mt-4 pt-4 border-t border-gray-50 dark:border-white/[0.06] flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ review.author }}</p>
              <p v-if="review.company" class="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{{ review.company }}</p>
            </div>
            <!-- Badge source -->
            <span
              class="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border"
              :class="sourceBadge(review.source)"
            >
              <svg v-if="review.source === 'malt'" class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="10" cy="10" r="8" />
                <path stroke-linecap="round" d="M10 6v8M6 10h8" />
              </svg>
              <svg v-else-if="review.source === 'google'" class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{{ sourceLabel(review.source) }}</span>
            </span>
          </footer>
        </article>
      </div>

      <!-- ── Centered CTA ──────────────────────────────────────────────────── -->
      <div v-if="ctaUrl" class="mt-10 text-center">
        <a
          :href="ctaUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.1] text-gray-700 dark:text-slate-200 font-semibold px-7 py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all text-sm"
          :aria-label="ctaLabel"
        >
          <svg class="w-4 h-4 text-warning-400 fill-current" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {{ ctaLabel }}
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
export interface Review {
  author:  string
  company: string
  rating:  number
  title:   string
  text:    string
  date:    string
  source:  string
}

export interface BusinessMeta {
  name:           string
  url:            string
  gmaps_url:      string | null
  total_rating:   number | null
  total_reviews:  number | null
}

interface ReviewsResponse {
  reviews:  Review[]
  total:    number
  business: BusinessMeta | null
}

const { t } = useT()
const props = withDefaults(defineProps<{
  /** Number of reviews to display (default 6) */
  limit?:          number
  /** Title displayed in h2 — if omitted, reads the i18n key `reviews.heading` */
  title?:          string
  /** CSS classes on the `<section>` tag */
  sectionClass?:   string
  /** CSS classes on the inner container */
  containerClass?: string
}>(), {
  limit:          6,
  title:          '',
  sectionClass:   'py-20 bg-gray-50 dark:bg-slate-900/50',
  containerClass: 'max-w-5xl mx-auto px-6',
})

const resolvedTitle = computed(() => props.title || t('reviews.heading'))

// ── Data fetching ────────────────────────────────────────────────────────────
const { data, status } = await useFetch<ReviewsResponse>('/api/reviews', {
  query: { limit: props.limit },
})

const reviews  = computed<Review[]>(() => data.value?.reviews ?? [])
const total    = computed<number>(() => data.value?.total ?? 0)
const business = computed<BusinessMeta | null>(() => data.value?.business ?? null)
const hasAggregate = computed<boolean>(() => !!business.value && business.value.total_rating !== null && business.value.total_rating !== undefined)

// CTA — "View all our reviews" button: opens Google Maps if `gmaps_url` is provided,
// otherwise hidden (the component doesn't push to a page if there's no target).
const ctaUrl   = computed(() => business.value?.gmaps_url ?? null)
const ctaLabel = computed(() => t('reviews.cta_google'))

// ── Metrics ────────────────────────────────────────────────────────────────
// Prefers the global average (`business.total_rating`, e.g., Google Places aggregate)
// if provided, otherwise recalculates from returned reviews.
const aggregateRating = computed(() => {
  if (business.value?.total_rating !== null && business.value?.total_rating !== undefined) {
    return business.value.total_rating.toFixed(1)
  }
  if (!reviews.value.length) return '5.0'
  const avg = reviews.value.reduce((sum, r) => sum + r.rating, 0) / reviews.value.length
  return avg.toFixed(1)
})

const reviewCountDisplay = computed(() => business.value?.total_reviews ?? total.value)

// ── Helpers UI ───────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function sourceBadge(source: string): string {
  if (source === 'malt')   return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800/30'
  if (source === 'google') return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800/30'
  return 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-100 dark:border-slate-700'
}

function sourceLabel(source: string): string {
  if (source === 'malt')   return 'Malt'
  if (source === 'google') return 'Google'
  return t('reviews.source_verified')
}

// ── JSON-LD Schema.org (LocalBusiness + AggregateRating + Reviews) ───────────
// Tenant-aware: uses `data.business` for name/url. Without business metadata,
// JSON-LD is NOT injected (we avoid pushing a false `LocalBusiness`).
useHead(() => {
  if (!reviews.value.length) return {}
  if (!business.value) return {}

  const ratingValue = aggregateRating.value
  const reviewCount = reviewCountDisplay.value

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'LocalBusiness',
    name:       business.value.name,
    url:        business.value.url,
    aggregateRating: {
      '@type':     'AggregateRating',
      ratingValue,
      reviewCount,
      bestRating:  '5',
      worstRating: '1',
    },
    review: reviews.value.map(r => ({
      '@type':       'Review',
      author:        { '@type': 'Person', name: r.author },
      datePublished: r.date,
      reviewBody:    r.text,
      reviewRating: {
        '@type':     'Rating',
        ratingValue: String(r.rating),
        bestRating:  '5',
        worstRating: '1',
      },
    })),
  }

  return {
    script: [
      {
        type:      'application/ld+json',
        innerHTML: JSON.stringify(schema),
      },
    ],
  }
})
</script>
