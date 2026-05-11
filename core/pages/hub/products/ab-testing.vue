
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">A/B Testing</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Expériences A/B sur fiches produit, prix, covers, CTA — cs_ab_experiment
          </p>
        </div>
        <button @click="openCreate" class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouvelle expérience
        </button>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button @click="statusFilter = ''; load()"
          :class="['text-left p-5 rounded-2xl border transition-all', !statusFilter ? 'bg-primary-50 border-primary-200 dark:bg-primary-500/15' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-gray-200']">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Toutes</p>
          <p class="text-2xl font-extrabold">{{ data?.total ?? 0 }}</p>
        </button>
        <button @click="statusFilter = 'running'; load()"
          :class="['text-left p-5 rounded-2xl border transition-all', statusFilter === 'running' ? 'bg-success-50 border-success-200 dark:bg-success-500/15' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-gray-200']">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">En cours</p>
          <p class="text-2xl font-extrabold text-success-600">{{ data?.running ?? 0 }}</p>
        </button>
        <button @click="statusFilter = 'draft'; load()"
          :class="['text-left p-5 rounded-2xl border transition-all', statusFilter === 'draft' ? 'bg-amber-50 border-amber-200 dark:bg-amber-500/15' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-gray-200']">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Brouillons</p>
          <p class="text-2xl font-extrabold text-amber-600">{{ data?.draft ?? 0 }}</p>
        </button>
        <button @click="statusFilter = 'ended'; load()"
          :class="['text-left p-5 rounded-2xl border transition-all', statusFilter === 'ended' ? 'bg-gray-100 border-gray-300' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-gray-200']">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Terminées</p>
          <p class="text-2xl font-extrabold text-gray-500">{{ data?.ended ?? 0 }}</p>
        </button>
      </div>

      
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="h-48 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 animate-pulse" />
      </div>
      <div v-else-if="!data?.experiments.length" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm px-6 py-16 text-center">
        <p class="text-3xl mb-3">🧪</p>
        <p class="text-sm font-semibold">Aucune expérience pour l'instant</p>
        <p class="text-xs text-gray-500 mt-1 mb-5">Lancez votre première expérience A/B pour mesurer ce qui marche vraiment.</p>
        <button @click="openCreate" class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white">Créer une expérience</button>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="e in data.experiments" :key="e.id" class="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden"
          :class="e.status === 'running' ? 'border-success-200 dark:border-success-500/30' : 'border-gray-100 dark:border-slate-800'">
          <div class="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-sm font-bold truncate">{{ e.name }}</h3>
                <span :class="['inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider', statusBadge(e.status)]">
                  <span class="w-1 h-1 rounded-full bg-current" />
                  {{ statusLabel(e.status) }}
                </span>
              </div>
              <p class="text-[11px] text-gray-500 font-mono">{{ e.slug }}</p>
              <NuxtLink v-if="e.productName" :to="`/hub/products?id=${e.productId}`" class="text-[11px] text-primary-600 hover:underline">{{ e.productName }}</NuxtLink>
              <span v-else class="text-[11px] text-gray-400">Expérience globale</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button @click="openEdit(e)" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500" title="Éditer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487 18.549 2.799a2.1 2.1 0 1 1 2.97 2.97L9.42 17.868a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897z" /></svg>
              </button>
              <button @click="deleteExperiment(e)" class="p-1.5 rounded hover:bg-danger-50 text-danger-500" title="Supprimer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79h14.456zM9.75 5.79h4.5" /></svg>
              </button>
            </div>
          </div>

          
          <div class="grid grid-cols-2 divide-x divide-gray-100 dark:divide-slate-800 border-t border-gray-100 dark:border-slate-800">
            <div class="px-5 py-4">
              <div class="flex items-center justify-between mb-1">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Variant A ({{ e.trafficSplit }}%)</p>
                <span v-if="e.winningVariant === 'a'" class="text-[10px] font-bold text-success-600">✓ Gagnant</span>
              </div>
              <p class="text-lg font-extrabold tabular-nums">{{ rateOf(e.conversionsA, e.viewsA) }}%</p>
              <p class="text-[10px] text-gray-500">{{ e.conversionsA }} / {{ e.viewsA }} vues</p>
              <p class="text-[10px] text-gray-400 mt-0.5">{{ fmtEur(e.revenueA) }}</p>
            </div>
            <div class="px-5 py-4">
              <div class="flex items-center justify-between mb-1">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Variant B ({{ 100 - e.trafficSplit }}%)</p>
                <span v-if="e.winningVariant === 'b'" class="text-[10px] font-bold text-success-600">✓ Gagnant</span>
              </div>
              <p class="text-lg font-extrabold tabular-nums">{{ rateOf(e.conversionsB, e.viewsB) }}%</p>
              <p class="text-[10px] text-gray-500">{{ e.conversionsB }} / {{ e.viewsB }} vues</p>
              <p class="text-[10px] text-gray-400 mt-0.5">{{ fmtEur(e.revenueB) }}</p>
            </div>
          </div>

          
          <div class="px-5 py-3 bg-gray-50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <div class="flex items-center gap-3">
              <span class="text-gray-500">Lift</span>
              <span class="font-bold tabular-nums" :class="liftClass(e)">{{ liftOf(e) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-gray-500">Signif.</span>
              <span :class="['font-bold px-2 py-0.5 rounded text-[10px]', significanceClass(e)]">{{ significanceOf(e) }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    
    <Transition enter-active-class="transition-opacity" enter-from-class="opacity-0" leave-active-class="transition-opacity" leave-to-class="opacity-0">
      <div v-if="modalOpen" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-auto" @click.self="modalOpen = false">
        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
            <h2 class="text-base font-bold">{{ form.id ? 'Modifier l\'expérience' : 'Nouvelle expérience' }}</h2>
            <button @click="modalOpen = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="px-6 py-5 space-y-5">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Nom de l'expérience</label>
                <input v-model="form.name" type="text" placeholder="ex: Cover — studio vs lifestyle"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Statut</label>
                <select v-model="form.status" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900">
                  <option value="draft">Brouillon</option>
                  <option value="running">En cours</option>
                  <option value="paused">En pause</option>
                  <option value="ended">Terminée</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Split trafic A ({{ form.trafficSplit }}% / {{ 100 - form.trafficSplit }}%)</label>
                <input v-model.number="form.trafficSplit" type="range" min="10" max="90" step="5" class="w-full" />
              </div>
              <div class="md:col-span-2">
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Produit ciblé (optionnel)</label>
                <input v-model="productQuery" @input="searchProducts" type="text" placeholder="Rechercher un produit… (laisser vide = expérience globale)"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
                <div v-if="productResults.length" class="mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow max-h-40 overflow-auto">
                  <button v-for="p in productResults" :key="p.id" @click="selectProduct(p)" class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                    <span class="font-medium">{{ p.name }}</span><span class="text-gray-400 ml-2 font-mono text-[10px]">#{{ p.id }}</span>
                  </button>
                </div>
              </div>
            </div>

            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-gray-50/50 dark:bg-slate-800/30">
                <p class="text-xs font-bold uppercase tracking-wider text-primary-600">Variant A</p>
                <input v-model="form.variantA.title" type="text" placeholder="Titre"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-900" />
                <input v-model="form.variantA.price" type="text" placeholder="Prix (ex: 49,00 €)"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-900" />
                <input v-model="form.variantA.cta" type="text" placeholder="CTA (ex: Ajouter au panier)"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-900" />
                <textarea v-model="form.variantA.description" placeholder="Description courte" rows="3"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-900 resize-none"></textarea>
              </div>
              <div class="border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-gray-50/50 dark:bg-slate-800/30">
                <p class="text-xs font-bold uppercase tracking-wider text-primary-600">Variant B</p>
                <input v-model="form.variantB.title" type="text" placeholder="Titre"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-900" />
                <input v-model="form.variantB.price" type="text" placeholder="Prix (ex: 49,00 €)"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-900" />
                <input v-model="form.variantB.cta" type="text" placeholder="CTA (ex: J'en profite)"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-900" />
                <textarea v-model="form.variantB.description" placeholder="Description courte" rows="3"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-900 resize-none"></textarea>
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Notes (hypothèse, contexte…)</label>
              <textarea v-model="form.notes" rows="2" placeholder="Ex : je teste un CTA plus direct pour voir si le taux de conversion augmente."
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 resize-none"></textarea>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 flex items-center justify-between sticky bottom-0">
            <p v-if="modalError" class="text-xs text-danger-600">{{ modalError }}</p>
            <span v-else class="text-[11px] text-gray-400">Les stats de conversion seront alimentées par le tracking front (à venir).</span>
            <div class="flex items-center gap-2">
              <button @click="modalOpen = false" class="text-xs font-semibold px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300">Annuler</button>
              <button @click="saveForm" :disabled="!form.name || savingModal"
                class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white">
                {{ form.id ? 'Enregistrer' : 'Créer' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface Variant { title?: string; price?: string; cta?: string; description?: string; cover?: string }
interface Experiment {
  id: number; name: string; slug: string; status: string
  productId: number | null; productName: string | null
  trafficSplit: number
  variantA: Variant; variantB: Variant
  viewsA: number; viewsB: number
  conversionsA: number; conversionsB: number
  revenueA: number; revenueB: number
  winningVariant: string | null
  dateStart: string | null; dateEnd: string | null
  notes: string | null
  dateAdd: string; dateUpd: string
}

const data = ref<{ total: number; running: number; draft: number; ended: number; experiments: Experiment[] } | null>(null)
const loading = ref(true)
const statusFilter = ref('')

async function load() {
  loading.value = true
  try {
    data.value = await $fetch('/api/bo/products/ab-testing', { query: statusFilter.value ? { status: statusFilter.value } : {} })
  } catch { data.value = null }
  finally { loading.value = false }
}

const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function rateOf(conv: number, views: number): string {
  if (!views) return '0.0'
  return ((conv / views) * 100).toFixed(1)
}

function liftOf(e: Experiment): string {
  if (!e.viewsA || !e.viewsB) return '—'
  const rA = e.conversionsA / e.viewsA
  const rB = e.conversionsB / e.viewsB
  if (!rA) return rB > 0 ? '+∞' : '—'
  const lift = ((rB - rA) / rA) * 100
  return `${lift > 0 ? '+' : ''}${lift.toFixed(1)}%`
}

function liftClass(e: Experiment): string {
  const lift = liftOf(e)
  if (lift === '—' || lift === '+∞') return 'text-gray-500'
  return lift.startsWith('+') ? 'text-success-600' : 'text-danger-600'
}

function significanceOf(e: Experiment): string {
  const nA = e.viewsA, nB = e.viewsB
  if (!nA || !nB) return 'Pas de donnée'
  const pA = e.conversionsA / nA
  const pB = e.conversionsB / nB
  const pPooled = (e.conversionsA + e.conversionsB) / (nA + nB)
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / nA + 1 / nB))
  if (!se) return 'Pas de donnée'
  const z = Math.abs(pB - pA) / se
  if (z >= 2.576) return '>99% sûr'
  if (z >= 1.96) return '>95% sûr'
  if (z >= 1.645) return '>90% sûr'
  return 'Non sûr'
}

function significanceClass(e: Experiment): string {
  const s = significanceOf(e)
  if (s.includes('99')) return 'bg-success-500 text-white'
  if (s.includes('95')) return 'bg-success-100 text-success-700'
  if (s.includes('90')) return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
}

function statusLabel(s: string): string {
  return ({ draft: 'Brouillon', running: 'En cours', paused: 'Pause', ended: 'Terminée' } as Record<string, string>)[s] || s
}
function statusBadge(s: string): string {
  return ({
    draft:   'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    running: 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400',
    paused:  'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
    ended:   'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
  } as Record<string, string>)[s] || 'bg-gray-100 text-gray-500'
}

const modalOpen = ref(false)
const modalError = ref('')
const savingModal = ref(false)

interface Form {
  id: number | null
  name: string
  status: string
  productId: number | null
  trafficSplit: number
  variantA: Variant
  variantB: Variant
  notes: string
}
const form = reactive<Form>({
  id: null, name: '', status: 'draft', productId: null, trafficSplit: 50,
  variantA: {}, variantB: {}, notes: '',
})

function resetForm() {
  form.id = null; form.name = ''; form.status = 'draft'
  form.productId = null; form.trafficSplit = 50
  form.variantA = {}; form.variantB = {}; form.notes = ''
  productQuery.value = ''; productResults.value = []
  modalError.value = ''
}

function openCreate() { resetForm(); modalOpen.value = true }
function openEdit(e: Experiment) {
  resetForm()
  form.id = e.id; form.name = e.name; form.status = e.status
  form.productId = e.productId; form.trafficSplit = e.trafficSplit
  form.variantA = { ...e.variantA }; form.variantB = { ...e.variantB }
  form.notes = e.notes || ''
  productQuery.value = e.productName || ''
  modalOpen.value = true
}

async function saveForm() {
  modalError.value = ''
  savingModal.value = true
  try {
    await $fetch('/api/bo/products/ab-testing', { method: 'POST', body: { ...form } })
    modalOpen.value = false
    load()
  } catch (e: any) {
    modalError.value = e?.statusMessage || 'Erreur enregistrement'
  } finally {
    savingModal.value = false
  }
}

async function deleteExperiment(e: Experiment) {
  if (!confirm(`Supprimer l'expérience "${e.name}" ?`)) return
  try {
    await $fetch('/api/bo/products/ab-testing', { method: 'DELETE', query: { id: e.id } })
    load()
  } catch (err) { console.error(err) }
}

const productQuery = ref('')
const productResults = ref<{ id: number; name: string }[]>([])
let productTimer: any
function searchProducts() {
  clearTimeout(productTimer)
  productTimer = setTimeout(async () => {
    if (!productQuery.value || productQuery.value.length < 2) { productResults.value = []; return }
    try {
      const res = await $fetch<any>('/api/bo/products', { query: { search: productQuery.value, perPage: 8 } })
      productResults.value = (res?.products || []).map((p: any) => ({ id: p.id, name: p.name }))
    } catch { productResults.value = [] }
  }, 250)
}
function selectProduct(p: { id: number; name: string }) {
  form.productId = p.id
  productQuery.value = p.name
  productResults.value = []
}

onMounted(load)
</script>
