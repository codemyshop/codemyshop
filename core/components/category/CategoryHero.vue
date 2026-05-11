
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
  
  fallbackIntro?: string | null
  
  subcategories?: SubcategoryPill[]
  
  imageWebpSrcset?: string | null
  
  imageSizes?: string | null
}>()

const altText = computed(
  () => props.imageAlt || `${props.label}`,
)

const imgLoadError = ref(false)
const fallbackError = ref(false)  
const heroImgRef = ref<HTMLImageElement | null>(null)
const hasImage = computed(() => !!props.imagePath && !imgLoadError.value)

const defaultCoverUrl = '/img/c/_default.webp'

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
      
      <div class="md:col-span-4">
        <figure class="relative aspect-square overflow-hidden rounded-xl bg-primary-50">
          <picture v-if="hasImage">
            
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
