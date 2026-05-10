<!--
  Hero générique d'une page catégorie/silo (réutilisable multi-tenant).
  Style voguimmo : H1 plein-format au-dessus, puis image GAUCHE col-4 +
  intro DROITE col-8. Empilé en mobile.

  - Image absente → SVG placeholder primary (pas de "vignette cassée")
  - Intro absente → fallback générique passé en prop ou rien
  - Pas de "lire plus" : intro affichée intégralement (anti-pattern UX qui
    cache du texte au crawler).
  - Sous-catégories en pills horizontales scrollables (slot subcategories
    si fournies par le parent).

  Couleurs via palettes sémantiques (primary-*) — chaque tenant définit ses
  --color-primary-* dans son main.css. Voir core/tailwind.config.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const { localePath } = useLocalePath()
const { t } = useT()
interface SubcategoryPill {
  label: string
  url: string
  badge?: string
}

const props = defineProps<{
  h1: string
  introHtml?: string | null
  imagePath?: string | null
  imageAlt?: string | null
  label: string
  /** Fallback text if `introHtml` is absent */
  fallbackIntro?: string | null
  /** Subcategories to display as horizontal scrollable pills */
  subcategories?: SubcategoryPill[]
  /** srcset WebP responsive (ex: "url-400.webp 400w, url-600.webp 600w, ..."). */
  imageWebpSrcset?: string | null
  /** `sizes` hint for the browser — e.g., `"(min-width: 768px) 33vw, 100vw"`. */
  imageSizes?: string | null
}>()

const altText = computed(
  () => props.imageAlt || `${props.label}`,
)
// Srcset check: if JPG fallback is missing (`imagePath` empty), don't display
// the `<picture>` element to avoid broken placeholder — the `v-else` SVG takes its place.
// If the final JPG fallback 404s at runtime (category without uploaded image source
// but the API returns a 'best-effort' URL), `imgLoadError` switches at runtime
// to switch to the SVG placeholder. No JPG → no attempt at
// WebP either (browser will fall back to JPG via `<picture>` which 404s → fallback to SVG).
const imgLoadError = ref(false)
const fallbackError = ref(false)  // /img/c/_default.webp 404 → SVG ultime
const heroImgRef = ref<HTMLImageElement | null>(null)
const hasImage = computed(() => !!props.imagePath && !imgLoadError.value)
// Asset served outside the build by nginx `static_img` — dynamic binding to
// avoid static imports scan of Vite (memory incidents
// feedback_vite_dynamic_src_for_external_assets).
const defaultCoverUrl = '/img/c/_default.webp'

// SSR renders `<img src="/img/c/{id}.jpg">` as 'best-effort' but the image may
// 404 — the `error` event fires BEFORE Vue hydration (so the
// `@error` binding misses the event). On mount, check `naturalWidth`:
// if 0 and `complete=true`, the image failed silently → switch to fallback.
onMounted(() => {
  const img = heroImgRef.value
  if (img && img.complete && img.naturalWidth === 0) {
    imgLoadError.value = true
  }
})
</script>

<template>
  <header>
    <h1 class="mb-6 text-3xl font-bold tracking-tight text-primary-900 sm:text-4xl lg:text-5xl dark:text-primary-100">
      {{ h1 }}
    </h1>

    <div class="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
      <!-- Image GAUCHE col-4 -->
      <div class="md:col-span-4">
        <figure class="relative aspect-square overflow-hidden rounded-xl bg-primary-50">
          <picture v-if="hasImage">
            <!-- sizes hint resserré : reflète le layout réel md:col-span-4
                 dans un container max-w-7xl (1280 px). Ancien hint
                 "(min-width: 768px) 33vw, 100vw" trop large : Lighthouse
                 Moto G servait 800.webp pour 380 CSS px (-42 KiB). Le hint
                 ci-dessous pousse le browser vers 400/600.webp aux DPR
                 typiques mobile/tablet (incidents 2026-05-06). -->
            <source
              v-if="imageWebpSrcset"
              type="image/webp"
              :srcset="imageWebpSrcset"
              :sizes="imageSizes || '(min-width: 1280px) 380px, (min-width: 1024px) 33vw, (min-width: 768px) 30vw, 100vw'"
            />
            <img
              ref="heroImgRef"
              :src="imagePath!"
              :alt="altText"
              width="400"
              height="400"
              class="h-full w-full object-cover"
              loading="eager"
              fetchpriority="high"
              @error="imgLoadError = true"
            />
          </picture>
          <!-- Fallback image catégorie : /img/c/_default.webp servi par le
               static_img tenant. Si ce fallback 404 lui aussi, on retombe sur
               le SVG neutre. -->
          <img
            v-else-if="!fallbackError"
            :src="defaultCoverUrl"
            :alt="altText"
            width="400"
            height="400"
            class="h-full w-full object-cover"
            loading="eager"
            @error="fallbackError = true"
          />
          <div v-else class="flex h-full w-full items-center justify-center text-primary-200">
            <svg class="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        </figure>
      </div>

      <!-- Intro RIGHT col-8: comfortable typography `prose-lg`, generous spacing -->
      <div class="md:col-span-8">
        <div
          v-if="introHtml"
          class="prose prose-lg max-w-none
                 [&_p]:mb-6 [&_p]:leading-relaxed [&_p]:text-slate-700
                 [&_a]:text-primary-600 [&_a]:font-medium [&_a]:no-underline hover:[&_a]:underline
                 [&_strong]:text-slate-900 [&_strong]:font-semibold
                 dark:[&_p]:text-slate-300 dark:[&_strong]:text-white"
          v-html="introHtml"
        />
        <p v-else-if="fallbackIntro" class="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          {{ fallbackIntro }}
        </p>
      </div>
    </div>

    <!-- Sous-catégories en pills multi-lignes — pleine largeur sous le hero.
         flex-wrap : tout visible d'un coup, pas de scroll horizontal caché. -->
    <div v-if="subcategories && subcategories.length > 0" class="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
      <p class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {{ t('silo.related_categories') }}
      </p>
      <div class="flex flex-wrap gap-2 pb-1">
        <NuxtLink
          v-for="sub in subcategories"
          :key="sub.url"
          :to="localePath(sub.url)"
          class="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          {{ sub.label }}
          <span
            v-if="sub.badge"
            class="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white"
          >
            {{ sub.badge }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
