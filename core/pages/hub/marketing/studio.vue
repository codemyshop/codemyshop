<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Studio Social · Shorts IA</h1>
          <p class="text-xs text-gray-400 mt-0.5">Générez des scripts vidéo 60s adaptés à votre avatar client</p>
        </div>
        <span
          class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
          :class="hasApiKey ? 'bg-success-100 text-success-700' : 'bg-amber-100 text-amber-700'"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="hasApiKey ? 'bg-success-400' : 'bg-amber-400'" />
          {{ hasApiKey ? 'Claude IA actif' : 'Mode démo' }}
        </span>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        
        <div class="space-y-5">

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Source du contenu</h2>

            
            <div class="flex gap-2 mb-4">
              <button
                v-for="tab in SOURCES"
                :key="tab.value"
                @click="source = tab.value; selectedItem = null"
                :class="[
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all',
                  source === tab.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:border-gray-300',
                ]"
              >
                {{ tab.icon }} {{ tab.label }}
              </button>
            </div>

            
            <div v-if="source === 'product'" class="space-y-3">
              <div v-if="productsLoading" class="space-y-2">
                <div v-for="i in 3" :key="i" class="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              </div>
              <div v-else-if="!products.length" class="text-xs text-gray-400 py-4 text-center">
                Aucun produit disponible (module ac_productextra requis)
              </div>
              <div
                v-for="p in products.slice(0, 10)"
                :key="p.id_product"
                @click="selectProduct(p)"
                :class="[
                  'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all',
                  selectedItem?.id === p.id_product
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:border-slate-700 hover:bg-gray-50',
                ]"
              >
                <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                  <img v-if="p.img_url" :src="p.img_url" :alt="p.name" class="w-full h-full object-cover" />
                  <svg v-else class="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium text-gray-800 dark:text-slate-100 truncate">{{ p.name }}</p>
                  <p class="text-xs text-gray-400">{{ formatPrice(p.price) }}</p>
                </div>
                <svg v-if="selectedItem?.id === p.id_product" class="w-4 h-4 text-primary-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>

            
            <div v-else-if="source === 'event'" class="space-y-3">
              <div v-if="eventsLoading" class="space-y-2">
                <div v-for="i in 3" :key="i" class="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              </div>
              <div v-else-if="!events.length" class="text-xs text-gray-400 py-4 text-center">
                Aucun événement publié
              </div>
              <div
                v-for="ev in events"
                :key="ev.id"
                @click="selectEvent(ev)"
                :class="[
                  'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all',
                  selectedItem?.id === ev.id
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:border-slate-700 hover:bg-gray-50',
                ]"
              >
                <div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium text-gray-800 dark:text-slate-100 truncate">{{ ev.title }}</p>
                  <p class="text-xs text-gray-400">{{ formatDate(ev.date) }}</p>
                </div>
                <svg v-if="selectedItem?.id === ev.id" class="w-4 h-4 text-primary-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>

            
            <div v-else>
              <textarea
                v-model="newsContent"
                rows="5"
                placeholder="Décrivez votre actualité, promotion, lancement produit… L’IA adaptera le script."
                class="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900 resize-none"
              />
            </div>
          </div>

          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">Ton & Style</h2>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="t in TONES"
                :key="t.value"
                @click="tone = t.value"
                :class="[
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left',
                  tone === t.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 hover:border-gray-300',
                ]"
              >
                <span>{{ t.icon }}</span>
                <div>
                  <p class="font-semibold leading-tight">{{ t.label }}</p>
                  <p class="opacity-70 font-normal" :class="tone === t.value ? 'text-white/70' : 'text-gray-400'">{{ t.hint }}</p>
                </div>
              </button>
            </div>
          </div>

          
          <button
            @click="generate"
            :disabled="generating || !canGenerate"
            class="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="generating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
            {{ generating ? 'Génération en cours…' : 'Générer le script Short' }}
          </button>
        </div>

        
        <div class="space-y-5">

          
          <div v-if="!script" class="flex flex-col items-center justify-center py-20 text-gray-300">
            <svg class="w-16 h-16 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <p class="text-sm font-medium text-gray-400">Le script apparaîtra ici</p>
            <p class="text-xs text-gray-300 mt-1">Choisissez une source et générez</p>
          </div>

          <template v-else>
            
            <div class="flex justify-center">
              <div class="w-56 aspect-[9/16] rounded-2xl overflow-hidden shadow-xl relative bg-gray-900 border border-gray-700">

                
                <div class="absolute inset-x-0 top-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
                  <div class="w-12 h-1.5 bg-white dark:bg-slate-900/30 rounded-full mb-3" />
                  <p class="text-white text-xs font-bold leading-snug drop-shadow">{{ script.hook }}</p>
                </div>

                
                <div class="absolute inset-0 bg-gradient-to-br from-primary-900/60 to-gray-900" />
                <div class="absolute inset-0 flex items-center justify-center opacity-10">
                  <svg class="w-20 h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>

                
                <div class="absolute inset-x-0 top-1/3 px-4 space-y-1.5 z-10">
                  <div
                    v-for="(b, i) in script.benefits"
                    :key="i"
                    class="bg-white dark:bg-slate-900/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/10"
                  >
                    <p class="text-white text-[10px] font-medium leading-snug">{{ b }}</p>
                  </div>
                </div>

                
                <div class="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-10">
                  <div class="bg-primary-500 rounded-lg px-3 py-2 text-center">
                    <p class="text-white text-[10px] font-bold">{{ script.cta }}</p>
                  </div>
                  <p class="text-white/50 text-[9px] text-center mt-2">~{{ script.estimatedDuration }}s</p>
                </div>
              </div>
            </div>

            
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Directions visuelles</h3>
              <ol class="space-y-2">
                <li
                  v-for="(d, i) in script.visualDirections"
                  :key="i"
                  class="flex items-start gap-2.5"
                >
                  <span class="w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{{ i + 1 }}</span>
                  <p class="text-xs text-gray-600 leading-relaxed">{{ d }}</p>
                </li>
              </ol>
            </div>

            
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Hashtags</h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="h in script.hashtags"
                  :key="h"
                  class="text-xs font-medium text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100"
                >{{ h }}</span>
              </div>
            </div>

            
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Exporter</h3>
              <div class="grid grid-cols-3 gap-2">

                
                <button
                  @click="copyScript"
                  class="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-primary-300 hover:bg-primary-50 transition-all group"
                >
                  <svg class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  <span class="text-xs text-gray-500 group-hover:text-primary-600 font-medium transition-colors">
                    {{ copied ? 'Copié !' : 'Copier' }}
                  </span>
                </button>

                
                <button
                  @click="shareWhatsApp"
                  class="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-green-300 hover:bg-green-50 transition-all group"
                >
                  <svg class="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                  <span class="text-xs text-gray-500 group-hover:text-green-600 font-medium transition-colors">WhatsApp</span>
                </button>

                
                <button
                  @click="shareEmail"
                  class="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  <span class="text-xs text-gray-500 group-hover:text-blue-600 font-medium transition-colors">Email</span>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import type { ShortScript } from '~/server/api/ai/generate-short.post'
import type { EventRecord } from '~/types/event'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface Product {
  id_product: number
  name:       string
  price:      string | number
  img_url?:   string
  category_name?: string
  description_short?: string
}

const SOURCES = [
  { value: 'product' as const, label: 'Produit',     icon: '🛍️' },
  { value: 'event'   as const, label: 'Événement',   icon: '📅' },
  { value: 'news'    as const, label: 'Actualité',   icon: '✍️' },
]

const TONES = [
  { value: 'énergétique et funky',          label: 'Funky',        icon: '🔥', hint: 'TikTok / GenZ' },
  { value: 'professionnel et expert',        label: 'Pro',          icon: '💼', hint: 'B2B / LinkedIn' },
  { value: 'tech et enthousiaste',           label: 'Tech',         icon: '🚀', hint: 'Startups / SaaS' }, 
  { value: 'chaleureux et communautaire',    label: 'Humain',       icon: '🤝', hint: 'Réseaux locaux' },
]

const { resolvedClientId } = useClientDetection()

const source      = ref<'product' | 'event' | 'news'>('product')
const tone        = ref(TONES[0].value)
const newsContent = ref('')
const generating  = ref(false)
const copied      = ref(false)
const hasApiKey   = ref(false)

const selectedItem = ref<{ id: number | string; content: string } | null>(null)

const products       = ref<Product[]>([])
const events         = ref<EventRecord[]>([])
const productsLoading = ref(false)
const eventsLoading   = ref(false)

const script = ref<ShortScript | null>(null)

const canGenerate = computed(() => {
  if (source.value === 'news')  return newsContent.value.trim().length > 0
  return !!selectedItem.value
})

const contentToSend = computed((): string => {
  if (source.value === 'news') return newsContent.value
  return selectedItem.value?.content ?? ''
})

async function loadProducts() {
  productsLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; products: Product[] }>(
      '/api/bo/productextra/products',
      { query: { limit: 20 } },
    )
    if (res.success) products.value = res.products
  } catch {
    
  } finally {
    productsLoading.value = false
  }
}

async function loadEvents() {
  eventsLoading.value = true
  try {
    const res = await $fetch<EventRecord[]>('/api/events', {
      query: { status: 'published' },
    })
    events.value = res
  } catch {
    
  } finally {
    eventsLoading.value = false
  }
}

async function checkApiKey() {
  try {
    const status = await $fetch<{ ai: { enabled: boolean } }>('/api/hub/system-status')
    hasApiKey.value = status.ai?.enabled ?? false
  } catch {
    
  }
}

function selectProduct(p: Product) {
  const content = [
    `Produit : ${p.name}`,
    p.category_name ? `Catégorie : ${p.category_name}` : '',
    `Prix : ${formatPrice(p.price)}`,
    p.description_short ? `Description : ${p.description_short.replace(/<[^>]+>/g, ' ')}` : '',
  ].filter(Boolean).join('\n')
  selectedItem.value = { id: p.id_product, content }
}

function selectEvent(ev: EventRecord) {
  const content = [
    `Événement : ${ev.title}`,
    `Date : ${formatDate(ev.date)}`,
    ev.location ? `Lieu : ${ev.location}` : '',
    ev.type === 'online' ? 'Format : En ligne' : '',
    ev.description ? `Description : ${ev.description}` : '',
  ].filter(Boolean).join('\n')
  selectedItem.value = { id: ev.id, content }
}

async function generate() {
  if (!canGenerate.value || generating.value) return
  generating.value = true
  script.value     = null

  try {
    const result = await $fetch<ShortScript>('/api/ai/generate-short', {
      method: 'POST',
      body: {
        source:   source.value,
        content:  contentToSend.value,
        clientId: resolvedClientId.value,
        tone:     tone.value,
      },
    })
    script.value = result
  } catch (err) {
    console.error('[studio] generate error:', err)
  } finally {
    generating.value = false
  }
}

function buildFullScript(): string {
  if (!script.value) return ''
  const s = script.value
  return [
    `🎬 HOOK\n${s.hook}`,
    `\n✅ AVANTAGES\n${s.benefits.map((b, i) => `${i + 1}. ${b}`).join('\n')}`,
    `\n👉 CTA\n${s.cta}`,
    `\n🎥 DIRECTIONS VISUELLES\n${s.visualDirections.map((d, i) => `${i + 1}. ${d}`).join('\n')}`,
    `\n#️⃣ HASHTAGS\n${s.hashtags.join(' ')}`,
    `\n⏱️ Durée estimée : ${s.estimatedDuration}s`,
  ].join('\n')
}

async function copyScript() {
  try {
    await navigator.clipboard.writeText(buildFullScript())
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  } catch {
    
  }
}

function shareWhatsApp() {
  const text = encodeURIComponent(buildFullScript())
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

function shareEmail() {
  const subject = encodeURIComponent('Script Short IA — ' + (script.value?.hook.slice(0, 40) ?? ''))
  const body    = encodeURIComponent(buildFullScript())
  window.location.href = `mailto:?subject=${subject}&body=${body}`
}

const formatPrice = (v: string | number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(v))

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(() => {
  loadProducts()
  loadEvents()
  checkApiKey()
})
</script>
