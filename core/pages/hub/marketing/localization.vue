<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Transcr&eacute;ation IA</h1>
          <p class="text-xs text-gray-400 mt-0.5">Produits, articles de blog et cat&eacute;gories &mdash; adapt&eacute;s &agrave; chaque march&eacute;</p>
        </div>
        <div class="flex items-center gap-2">
          <span v-for="loc in LOCALES" :key="loc.locale" class="text-lg" :title="loc.label">{{ loc.flag }}</span>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      <!-- ── S&eacute;lecteur de type de contenu ──────────────────────────────── -->
      <div class="flex gap-2">
        <button
          v-for="tab in CONTENT_TABS"
          :key="tab.id"
          @click="switchContentType(tab.id)"
          :class="[
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
            contentType === tab.id
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-600 hover:border-gray-300',
          ]"
        >
          <span class="text-base">{{ tab.icon }}</span>
          {{ tab.label }}
          <span
            v-if="getItemCount(tab.id) > 0"
            class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            :class="contentType === tab.id ? 'bg-primary-200 text-primary-800' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'"
          >{{ getItemCount(tab.id) }}</span>
        </button>
      </div>

      <!-- ── S&eacute;lecteur d'item ─────────────────────────────────────────── -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">
          1. S&eacute;lectionnez {{ contentType === 'product' ? 'un produit' : contentType === 'article' ? 'un article' : 'une cat&eacute;gorie' }}
        </h2>

        <!-- Loading -->
        <div v-if="itemsLoading" class="space-y-2">
          <div v-for="i in 4" :key="i" class="h-12 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>

        <!-- Vide -->
        <div v-else-if="!items.length" class="text-sm text-gray-400 py-6 text-center">
          {{ contentType === 'product' ? 'Aucun produit (module ac_productextra requis)' : contentType === 'article' ? 'Aucun article de blog' : 'Aucune cat\u00e9gorie' }}
        </div>

        <!-- Liste -->
        <div v-else class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="item in items"
            :key="item.id"
            @click="selectItem(item)"
            :class="[
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
              selectedItem?.id === item.id
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:border-slate-700 hover:bg-gray-50',
            ]"
          >
            <!-- Icon / Image -->
            <div class="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                 :class="item.image ? 'bg-gray-100 dark:bg-slate-800' : contentType === 'article' ? 'bg-primary-100' : contentType === 'category' ? 'bg-amber-100' : 'bg-gray-100 dark:bg-slate-800'">
              <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
              <span v-else class="text-sm">{{ contentType === 'article' ? '\u270d\ufe0f' : contentType === 'category' ? '\ud83d\udcc1' : '\ud83d\udce6' }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">{{ item.name }}</p>
              <p class="text-xs text-gray-400 truncate">{{ item.subtitle }}</p>
            </div>
            <svg v-if="selectedItem?.id === item.id" class="w-5 h-5 text-primary-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <!-- ── Zone de travail (source + transcr&eacute;ation) ──────────────────── -->
      <div v-if="selectedItem" class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Gauche : Texte source FR -->
        <div class="space-y-4">
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-lg">\ud83c\uddeb\ud83c\uddf7</span>
              <h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200">Texte original (FR)</h3>
              <span class="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    :class="contentType === 'product' ? 'bg-gray-100 dark:bg-slate-800 text-gray-500' : contentType === 'article' ? 'bg-primary-50 text-primary-600' : 'bg-amber-50 text-amber-600'">
                {{ contentType === 'product' ? 'Produit' : contentType === 'article' ? 'Article' : 'Cat\u00e9gorie' }}
              </span>
            </div>
            <div class="space-y-3">
              <div>
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  {{ contentType === 'article' ? 'Titre' : 'Nom' }}
                </p>
                <p class="text-sm text-gray-800 dark:text-slate-100 font-medium">{{ selectedItem.name }}</p>
              </div>
              <div v-if="sourceText">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  {{ contentType === 'article' ? 'Contenu' : 'Description' }}
                </p>
                <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{{ sourceText }}</p>
              </div>
              <div v-else class="text-xs text-gray-400 italic py-4">
                Pas de contenu textuel disponible.
              </div>
            </div>
          </div>

          <!-- Boutons transcr&eacute;ation -->
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">2. Transcr&eacute;er vers&hellip;</h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="loc in targetLocales"
                :key="loc.locale"
                @click="transcreate(loc.locale)"
                :disabled="generating === loc.locale || !sourceText"
                class="flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                :class="results[loc.locale]
                  ? 'border-success-300 bg-success-50 text-success-700'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 hover:border-primary-300 hover:bg-primary-50'"
              >
                <svg v-if="generating === loc.locale" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span v-else class="text-lg">{{ loc.flag }}</span>
                {{ generating === loc.locale ? 'G\u00e9n\u00e9ration\u2026' : results[loc.locale] ? '\u2713 ' + loc.label : loc.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Droite : R&eacute;sultats -->
        <div class="space-y-4">
          <div v-if="!Object.keys(results).length" class="flex flex-col items-center justify-center py-20 text-gray-300">
            <svg class="w-14 h-14 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
            </svg>
            <p class="text-sm font-medium text-gray-400">Les transcr&eacute;ations appara&icirc;tront ici</p>
          </div>

          <div
            v-for="(res, locale) in results"
            :key="locale"
            class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
          >
            <div class="px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ getLocale(locale).flag }}</span>
                <span class="text-sm font-bold text-gray-700 dark:text-slate-200">{{ getLocale(locale).label }}</span>
              </div>
              <div class="flex items-center gap-2">
                <button @click="copyText(res.transcreated, locale)" class="text-xs text-gray-500 hover:text-primary-600 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  {{ copiedLocale === locale ? 'Copi\u00e9 !' : 'Copier' }}
                </button>
              </div>
            </div>
            <div class="px-5 py-4">
              <p class="text-sm text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{{ res.transcreated }}</p>
            </div>
            <div v-if="res.culturalNotes.length" class="px-5 pb-3">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes culturelles</p>
              <ul class="space-y-1.5">
                <li v-for="(note, i) in res.culturalNotes" :key="i" class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-primary-100 text-primary-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{{ i + 1 }}</span>
                  <p class="text-xs text-gray-500 leading-relaxed">{{ note }}</p>
                </li>
              </ul>
            </div>
            <div v-if="res.adaptations.length" class="px-5 pb-4 border-t border-gray-50 pt-3">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Adaptations</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="(adapt, i) in res.adaptations" :key="i" class="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-slate-800">{{ adapt }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
/**
 */
import type { TranscreationResult } from '~/server/api/ai/transcreate.post'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

type ContentType = 'product' | 'article' | 'category'

interface ContentItem {
  id:       string | number
  name:     string
  subtitle: string
  text:     string
  image?:   string
}

interface Product {
  id_product: number; name: string; price: string | number
  img_url?: string; category_name?: string
  description_short?: string; description?: string
}

interface Article {
  id: number; title: string; excerpt: string; coverImage?: string
  nuxtUrl: string; category: string
}

// ── Constantes ────────────────────────────────────────────────────────────────

const CONTENT_TABS = [
  { id: 'product'  as ContentType, icon: '\ud83d\udce6', label: 'Produits' },
  { id: 'article'  as ContentType, icon: '\u270d\ufe0f', label: 'Articles' },
  { id: 'category' as ContentType, icon: '\ud83d\udcc1', label: 'Cat\u00e9gories' },
]

const LOCALES = [
  { locale: 'fr', label: 'Fran\u00e7ais', flag: '\ud83c\uddeb\ud83c\uddf7' },
  { locale: 'en', label: 'English',  flag: '\ud83c\uddec\ud83c\udde7' },
  { locale: 'de', label: 'Deutsch',  flag: '\ud83c\udde9\ud83c\uddea' },
]
const targetLocales = LOCALES.filter(l => l.locale !== 'fr')

function getLocale(locale: string) {
  return LOCALES.find(l => l.locale === locale) ?? LOCALES[0]
}

// ── État ──────────────────────────────────────────────────────────────────────

const { resolvedClientId } = useClientDetection()

const contentType    = ref<ContentType>('product')
const itemsLoading   = ref(false)
const selectedItem   = ref<ContentItem | null>(null)
const generating     = ref<string | null>(null)
const copiedLocale   = ref<string | null>(null)
const results        = ref<Record<string, TranscreationResult>>({})

// Données brutes par type
const products   = ref<Product[]>([])
const articles   = ref<Article[]>([])
const categories = ref<any[]>([])

// ── Computed ──────────────────────────────────────────────────────────────────

const items = computed<ContentItem[]>(() => {
  switch (contentType.value) {
    case 'product':
      return products.value.map(p => ({
        id:       p.id_product,
        name:     p.name,
        subtitle: `${p.category_name || 'Sans cat\u00e9gorie'} \u00b7 ${formatPrice(p.price)}`,
        text:     stripHtml(p.description || p.description_short || ''),
        image:    p.img_url,
      }))
    case 'article':
      return articles.value.map(a => ({
        id:       a.id,
        name:     a.title,
        subtitle: a.category || 'Blog',
        text:     a.excerpt || '',
        image:    a.coverImage,
      }))
    case 'category':
      return categories.value.map(c => ({
        id:       c.id,
        name:     c.name,
        subtitle: `ID ${c.id} \u00b7 ${c.productCount ?? '?'} produits`,
        text:     stripHtml(c.description || c.meta_description || ''),
      }))
    default:
      return []
  }
})

const sourceText = computed(() => selectedItem.value?.text || '')

function getItemCount(type: ContentType): number {
  switch (type) {
    case 'product':  return products.value.length
    case 'article':  return articles.value.length
    case 'category': return categories.value.length
    default: return 0
  }
}

// ── Chargement ────────────────────────────────────────────────────────────────

async function loadProducts() {
  try {
    const res = await $fetch<{ success: boolean; products: Product[] }>(
      '/api/bo/productextra/products',
      { query: { limit: 50 } },
    )
    if (res.success) products.value = res.products
  } catch { /* module absent */ }
}

async function loadArticles() {
  try {
    const data = await $fetch<Article[]>('/api/cms', { query: { limit: 50 } })
    articles.value = data
  } catch { /* API absente */ }
}

async function loadCategories() {
  try {
    // Fetch from the PS Webservice via our proxy
    const data = await $fetch<any[]>(`/api/catalogue/categories`, {
      query: { clientId: resolvedClientId.value },
    })
    categories.value = data
  } catch {
    // Fallback: load from CRM if the proxy doesn't exist yet
    try {
      const res = await $fetch<{ success: boolean; categories: any[] }>(
        '/api/bo/productextra/form-data',
      )
      if (res.success || res.categories) {
        categories.value = (res.categories || []).map((c: any) => ({
          id: c.id_category,
          name: c.name,
          description: '',
          meta_description: '',
          productCount: null,
        }))
      }
    } catch { /* */ }
  }
}

function switchContentType(type: ContentType) {
  contentType.value = type
  selectedItem.value = null
  results.value = {}
}

function selectItem(item: ContentItem) {
  selectedItem.value = item
  results.value = {}
}

// ── Transcr&eacute;ation ──────────────────────────────────────────────────────────

async function transcreate(locale: string) {
  if (!sourceText.value || generating.value) return
  generating.value = locale

  try {
    const res = await $fetch<TranscreationResult>('/api/ai/transcreate', {
      method: 'POST',
      body: {
        text:         sourceText.value,
        targetLocale: locale,
        avatarType:   contentType.value === 'product' ? 'Grossiste B2B' : 'Lecteur web',
        clientTone:   resolvedClientId.value,
        productName:  selectedItem.value?.name,
      },
    })
    results.value = { ...results.value, [locale]: res }
  } catch (err) {
    console.error('[localization] transcreate error:', err)
  } finally {
    generating.value = null
  }
}

async function copyText(text: string, locale: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedLocale.value = locale
    setTimeout(() => { copiedLocale.value = null }, 2500)
  } catch { /* */ }
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

const formatPrice = (v: string | number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(v))

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(() => {
  itemsLoading.value = true
  Promise.all([loadProducts(), loadArticles(), loadCategories()])
    .finally(() => { itemsLoading.value = false })
})
</script>
