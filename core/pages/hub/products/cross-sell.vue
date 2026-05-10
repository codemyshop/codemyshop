<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  PIM — Cross-sell / Upsell.
  Tab 1 : Suggestions IA (co-achats fréquents depuis ps_order_detail)
  Tab 2 : Règles manuelles (CRUD ps_accessory PrestaShop natif)
-->
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Cross-sell / Upsell</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Suggestions IA basées sur vos commandes + règles manuelles stockées dans ps_accessory
          </p>
        </div>
        <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          <button @click="activeTab = 'suggestions'"
            class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            :class="activeTab === 'suggestions' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
            Suggestions IA
          </button>
          <button @click="activeTab = 'rules'"
            class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            :class="activeTab === 'rules' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
            Règles manuelles
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      <!-- ═══ TAB: Suggestions IA ═══════════════════════════════════════════ -->
      <template v-if="activeTab === 'suggestions'">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Co-achats détectés</h2>
              <p class="text-xs text-gray-500 mt-0.5">Paires de produits commandés ensemble au moins {{ minCo }} fois, triées par fréquence</p>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-500">Seuil</label>
              <input v-model.number="minCo" type="number" min="1" max="50" @change="loadSuggestions()"
                class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 w-16 bg-white dark:bg-slate-900" />
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Produit source</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Produit associé</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Co-achats</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Confiance</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-if="loadingSuggestions" v-for="i in 5" :key="i"><td colspan="5" class="px-4 py-3"><div class="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td></tr>
                <tr v-else-if="!suggestions?.suggestions.length">
                  <td colspan="5" class="px-4 py-10 text-center text-gray-400">
                    Aucune suggestion. Pas assez de données de commandes pour détecter des co-achats au seuil {{ minCo }}.
                  </td>
                </tr>
                <tr v-for="s in suggestions?.suggestions" :key="`${s.src}-${s.dst}`" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-2"><p class="font-medium">{{ s.srcName }}</p><p class="text-[10px] text-gray-400 font-mono">#{{ s.src }}</p></td>
                  <td class="px-4 py-2"><p class="font-medium">{{ s.dstName }}</p><p class="text-[10px] text-gray-400 font-mono">#{{ s.dst }}</p></td>
                  <td class="px-4 py-2 text-right font-bold tabular-nums">{{ s.coCount }}</td>
                  <td class="px-4 py-2 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <div class="w-16 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-primary-500 rounded-full" :style="{ width: `${Math.min(100, s.confidence)}%` }" />
                      </div>
                      <span class="tabular-nums text-gray-600 dark:text-slate-400 w-10">{{ s.confidence }}%</span>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <button @click="acceptSuggestion(s)" :disabled="savingPair === `${s.src}-${s.dst}`"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-[11px] font-semibold">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Ajouter
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- ═══ TAB: Manual rules ═════════════════════════════════════════ -->
      <template v-if="activeTab === 'rules'">
        <!-- Rule creation -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Créer une règle</h2>
            <p class="text-xs text-gray-500 mt-0.5">Source = affichage sur la fiche · Accessoire = produit suggéré</p>
          </div>
          <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Produit source</label>
              <input v-model="srcQuery" type="text" placeholder="Rechercher un produit…"
                @input="searchProducts('src')"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <div v-if="srcResults.length" class="mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                <button v-for="p in srcResults" :key="p.id" @click="selectSrc(p)"
                  class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                  <span class="font-medium">{{ p.name }}</span>
                  <span class="text-gray-400 ml-2 font-mono text-[10px]">#{{ p.id }}</span>
                </button>
              </div>
              <div v-if="srcSelected" class="mt-2 inline-flex items-center gap-2 text-xs bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded">
                <span>{{ srcSelected.name }}</span>
                <button @click="srcSelected = null; srcQuery = ''" class="hover:text-primary-900">×</button>
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Produit accessoire</label>
              <input v-model="dstQuery" type="text" placeholder="Rechercher un produit…"
                @input="searchProducts('dst')"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <div v-if="dstResults.length" class="mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                <button v-for="p in dstResults" :key="p.id" @click="selectDst(p)"
                  class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                  <span class="font-medium">{{ p.name }}</span>
                  <span class="text-gray-400 ml-2 font-mono text-[10px]">#{{ p.id }}</span>
                </button>
              </div>
              <div v-if="dstSelected" class="mt-2 inline-flex items-center gap-2 text-xs bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded">
                <span>{{ dstSelected.name }}</span>
                <button @click="dstSelected = null; dstQuery = ''" class="hover:text-primary-900">×</button>
              </div>
            </div>
          </div>
          <div class="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 flex items-center justify-between">
            <p v-if="createError" class="text-xs text-danger-600">{{ createError }}</p>
            <p v-else-if="createSuccess" class="text-xs text-success-600">✓ Règle créée</p>
            <span v-else class="text-xs text-gray-400">Les deux produits doivent être sélectionnés.</span>
            <button @click="createRule" :disabled="!srcSelected || !dstSelected || creating"
              class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white">
              Créer la règle
            </button>
          </div>
        </div>

        <!-- List of existing rules -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Règles actives</h2>
              <p class="text-xs text-gray-500 mt-0.5">{{ rules?.total ?? 0 }} règle(s) dans ps_accessory</p>
            </div>
            <input v-model="rulesSearch" @input="loadRulesDebounced" type="text" placeholder="Filtrer…"
              class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-52 bg-white dark:bg-slate-900" />
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Produit source</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Accessoire affiché</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-if="loadingRules" v-for="i in 4" :key="i"><td colspan="3" class="px-4 py-3"><div class="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td></tr>
                <tr v-else-if="!rules?.rules.length">
                  <td colspan="3" class="px-4 py-10 text-center text-gray-400">Aucune règle. Créez-en une ci-dessus ou acceptez une suggestion.</td>
                </tr>
                <tr v-for="r in rules?.rules" :key="`${r.src}-${r.dst}`" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-2"><p class="font-medium">{{ r.srcName }}</p><p class="text-[10px] text-gray-400 font-mono">{{ r.srcRef || `#${r.src}` }}</p></td>
                  <td class="px-4 py-2"><p class="font-medium">{{ r.dstName }}</p><p class="text-[10px] text-gray-400 font-mono">{{ r.dstRef || `#${r.dst}` }}</p></td>
                  <td class="px-4 py-2 text-right">
                    <button @click="deleteRule(r)" :disabled="deletingPair === `${r.src}-${r.dst}`"
                      class="inline-flex items-center gap-1 text-[11px] font-semibold text-danger-600 hover:text-danger-700 disabled:opacity-50">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      Retirer
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface Suggestion { src: number; srcName: string; dst: number; dstName: string; coCount: number; srcTotal: number; confidence: number }
interface Rule       { src: number; dst: number; srcName: string; dstName: string; srcRef: string; dstRef: string }
interface Product    { id: number; name: string }

const activeTab   = ref<'suggestions' | 'rules'>('suggestions')

// ── Onglet Suggestions ──
const minCo              = ref(2)
const suggestions        = ref<{ minCoOccurrences: number; total: number; suggestions: Suggestion[] } | null>(null)
const loadingSuggestions = ref(true)
const savingPair         = ref<string | null>(null)

async function loadSuggestions() {
  loadingSuggestions.value = true
  try {
    suggestions.value = await $fetch('/api/bo/products/cross-sell/suggestions', {
      query: { minCoOccurrences: minCo.value, limit: 100 },
    })
  } catch { suggestions.value = null }
  finally { loadingSuggestions.value = false }
}

async function acceptSuggestion(s: Suggestion) {
  savingPair.value = `${s.src}-${s.dst}`
  try {
    await $fetch('/api/bo/products/cross-sell/rules', {
      method: 'POST',
      body: { src: s.src, dst: s.dst },
    })
    // Removes the suggestion from the list (rule now created)
    if (suggestions.value) {
      suggestions.value.suggestions = suggestions.value.suggestions.filter(x => !(x.src === s.src && x.dst === s.dst))
      suggestions.value.total = suggestions.value.suggestions.length
    }
    loadRules()
  } catch (e) { console.error(e) }
  finally { savingPair.value = null }
}

// ── Rules tab ──
const rules          = ref<{ total: number; rules: Rule[] } | null>(null)
const loadingRules   = ref(true)
const rulesSearch    = ref('')
const deletingPair   = ref<string | null>(null)

async function loadRules() {
  loadingRules.value = true
  try {
    rules.value = await $fetch('/api/bo/products/cross-sell/rules', {
      query: rulesSearch.value ? { search: rulesSearch.value } : {},
    })
  } catch { rules.value = null }
  finally { loadingRules.value = false }
}

let debounceTimer: any = null
function loadRulesDebounced() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadRules, 250)
}

async function deleteRule(r: Rule) {
  if (!confirm(`Retirer "${r.dstName}" des accessoires de "${r.srcName}" ?`)) return
  deletingPair.value = `${r.src}-${r.dst}`
  try {
    await $fetch(`/api/bo/products/cross-sell/rules`, {
      method: 'DELETE',
      query: { src: r.src, dst: r.dst },
    })
    loadRules()
  } catch (e) { console.error(e) }
  finally { deletingPair.value = null }
}

// ── Rule creation (product picker) ──
const srcQuery    = ref('')
const dstQuery    = ref('')
const srcResults  = ref<Product[]>([])
const dstResults  = ref<Product[]>([])
const srcSelected = ref<Product | null>(null)
const dstSelected = ref<Product | null>(null)
const creating    = ref(false)
const createError = ref('')
const createSuccess = ref(false)

let srcTimer: any = null
let dstTimer: any = null
function searchProducts(which: 'src' | 'dst') {
  const timer = which === 'src' ? srcTimer : dstTimer
  clearTimeout(timer)
  const run = async () => {
    const query = which === 'src' ? srcQuery.value : dstQuery.value
    if (!query || query.length < 2) {
      if (which === 'src') srcResults.value = []
      else dstResults.value = []
      return
    }
    try {
      const data = await $fetch<any>('/api/bo/products', { query: { search: query, perPage: 8 } })
      const results = (data?.products || []).map((p: any) => ({ id: p.id, name: p.name }))
      if (which === 'src') srcResults.value = results
      else dstResults.value = results
    } catch { /* silent */ }
  }
  if (which === 'src') srcTimer = setTimeout(run, 250)
  else                 dstTimer = setTimeout(run, 250)
}

function selectSrc(p: Product) { srcSelected.value = p; srcQuery.value = p.name; srcResults.value = [] }
function selectDst(p: Product) { dstSelected.value = p; dstQuery.value = p.name; dstResults.value = [] }

async function createRule() {
  if (!srcSelected.value || !dstSelected.value) return
  if (srcSelected.value.id === dstSelected.value.id) {
    createError.value = 'Les deux produits doivent être distincts'
    return
  }
  creating.value = true
  createError.value = ''
  createSuccess.value = false
  try {
    const res = await $fetch<any>('/api/bo/products/cross-sell/rules', {
      method: 'POST',
      body: { src: srcSelected.value.id, dst: dstSelected.value.id },
    })
    if (res?.alreadyExists) {
      createError.value = `Paire déjà présente : « ${srcSelected.value.name} → ${dstSelected.value.name} »`
      setTimeout(() => { createError.value = '' }, 4000)
    } else {
      createSuccess.value = true
      setTimeout(() => { createSuccess.value = false }, 2500)
    }
    srcSelected.value = null; dstSelected.value = null
    srcQuery.value = '';      dstQuery.value = ''
    loadRules()
  } catch (e: any) {
    createError.value = e?.statusMessage || 'Erreur création'
  } finally {
    creating.value = false
  }
}

onMounted(() => { loadSuggestions(); loadRules() })
</script>
