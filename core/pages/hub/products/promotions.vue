
<script setup lang="ts">
definePageMeta({ layout: 'hub' })

interface Promotion {
  id: number
  idProduct: number
  idGroup: number
  productName: string | null
  productRef: string | null
  reduction: number
  reductionType: 'percentage' | 'amount'
  reductionTax: number
  fromQuantity: number
  dateFrom: string | null
  dateTo: string | null
  status: 'active' | 'future' | 'expired'
}

const status = ref<'all' | 'active' | 'future' | 'expired'>('active')
const search = ref('')
const limit  = ref(50)
const offset = ref(0)

const queryParams = computed(() => ({
  status: status.value,
  search: search.value || undefined,
  limit: limit.value,
  offset: offset.value,
}))

const { data, refresh, pending } = useFetch<{ ok: boolean; total: number; promotions: Promotion[] }>(
  '/api/bo/specific-prices',
  {
    query: queryParams,
    watch: [status, search, limit, offset],
    server: false,
    lazy: true,
    default: () => ({ ok: false, total: 0, promotions: [] }),
  },
)
const promotions = computed(() => data.value?.promotions ?? [])
const total      = computed(() => data.value?.total ?? 0)

type Mode = 'product' | 'category'
interface FormState {
  open: boolean
  editId: number | null
  mode: Mode
  idProduct: number | null
  productSearch: string
  productLabel: string
  idCategory: number | null
  categoryLabel: string
  reductionPct: number      
  reductionAmount: number   
  reductionType: 'percentage' | 'amount'
  reductionTax: 1 | 0       
  fromQuantity: number
  idGroup: number
  dateFrom: string          
  dateTo: string
  saving: boolean
  error: string | null
}

function blankForm(): FormState {
  return {
    open: false, editId: null, mode: 'product',
    idProduct: null, productSearch: '', productLabel: '',
    idCategory: null, categoryLabel: '',
    reductionPct: 10, reductionAmount: 1, reductionType: 'percentage',
    reductionTax: 1, fromQuantity: 1, idGroup: 0,
    dateFrom: '', dateTo: '',
    saving: false, error: null,
  }
}
const form = ref<FormState>(blankForm())

function openCreate() {
  form.value = blankForm()
  form.value.open = true
}
function openEdit(p: Promotion) {
  form.value = blankForm()
  form.value.open = true
  form.value.editId = p.id
  form.value.mode = 'product'
  form.value.idProduct = p.idProduct
  form.value.productLabel = `#${p.idProduct} ${p.productName || ''}`
  form.value.reductionType = p.reductionType
  if (p.reductionType === 'percentage') form.value.reductionPct = +(p.reduction * 100).toFixed(2)
  else form.value.reductionAmount = +p.reduction.toFixed(2)
  form.value.reductionTax = p.reductionTax === 0 ? 0 : 1
  form.value.fromQuantity = p.fromQuantity
  form.value.idGroup = p.idGroup
  form.value.dateFrom = p.dateFrom ? p.dateFrom.slice(0, 10) : ''
  form.value.dateTo   = p.dateTo   ? p.dateTo.slice(0, 10)   : ''
}
function closeForm() { form.value.open = false }

const productResults = ref<Array<{ id: number; name: string; reference: string }>>([])
let productSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => form.value.productSearch, (s) => {
  if (productSearchTimer) clearTimeout(productSearchTimer)
  if (!s || s.length < 2) { productResults.value = []; return }
  productSearchTimer = setTimeout(async () => {
    const r = await $fetch<any>('/api/bo/products', { query: { search: s, perPage: 8, page: 1 } })
    productResults.value = (r?.products || r?.items || []).map((p: any) => ({
      id: Number(p.id || p.id_product),
      name: String(p.name || ''),
      reference: String(p.reference || ''),
    }))
  }, 250)
})
function selectProduct(p: { id: number; name: string; reference: string }) {
  form.value.idProduct = p.id
  form.value.productLabel = `#${p.id} ${p.name}${p.reference ? ` (${p.reference})` : ''}`
  form.value.productSearch = ''
  productResults.value = []
}

const categories = ref<Array<{ id: number; name: string; depth: number }>>([])
async function loadCategories() {
  if (categories.value.length) return
  try {
    const r = await $fetch<any>('/api/bo/categories')
    const items = r?.categories || r?.items || []
    categories.value = items.map((c: any) => ({
      id: Number(c.id || c.id_category),
      name: String(c.name || ''),
      depth: Number(c.depth || c.level_depth || 0),
    }))
  } catch (e) {  }
}
watch(() => form.value.mode, (m) => { if (m === 'category') loadCategories() })

async function submitForm() {
  form.value.saving = true
  form.value.error = null
  try {
    const reduction = form.value.reductionType === 'percentage'
      ? +(form.value.reductionPct / 100).toFixed(6)
      : +form.value.reductionAmount.toFixed(6)
    if (!(reduction > 0)) throw new Error('Réduction invalide')
    if (form.value.reductionType === 'percentage' && reduction >= 1) {
      throw new Error('% doit être < 100')
    }
    const dateFrom = form.value.dateFrom ? `${form.value.dateFrom} 00:00:00` : null
    const dateTo   = form.value.dateTo   ? `${form.value.dateTo} 23:59:59`   : null

    if (form.value.editId) {
      await $fetch(`/api/bo/specific-prices/${form.value.editId}`, {
        method: 'PUT',
        body: {
          reduction,
          reductionType: form.value.reductionType,
          reductionTax: form.value.reductionTax,
          fromQuantity: form.value.fromQuantity,
          idGroup: form.value.idGroup,
          dateFrom, dateTo,
        },
      })
    } else {
      if (form.value.mode === 'product' && !form.value.idProduct) throw new Error('Choisis un produit')
      if (form.value.mode === 'category' && !form.value.idCategory) throw new Error('Choisis une catégorie')
      await $fetch('/api/bo/specific-prices', {
        method: 'POST',
        body: {
          mode: form.value.mode,
          idProduct: form.value.mode === 'product' ? form.value.idProduct : undefined,
          idCategory: form.value.mode === 'category' ? form.value.idCategory : undefined,
          reduction,
          reductionType: form.value.reductionType,
          reductionTax: form.value.reductionTax,
          fromQuantity: form.value.fromQuantity,
          idGroup: form.value.idGroup,
          dateFrom, dateTo,
        },
      })
    }
    closeForm()
    await refresh()
  } catch (e: any) {
    form.value.error = e?.data?.statusMessage || e?.message || 'Erreur'
  } finally {
    form.value.saving = false
  }
}

async function deletePromo(p: Promotion) {
  if (!confirm(`Supprimer la promotion sur "${p.productName || p.idProduct}" ?`)) return
  await $fetch(`/api/bo/specific-prices/${p.id}`, { method: 'DELETE' })
  await refresh()
}

function fmtReduction(p: Promotion): string {
  if (p.reductionType === 'percentage') return `-${(p.reduction * 100).toFixed(p.reduction * 100 >= 10 ? 0 : 1)}%`
  return `-${p.reduction.toFixed(2)} €`
}
function fmtDate(d: string | null): string {
  if (!d) return '—'
  return d.slice(0, 10).split('-').reverse().join('/')
}
function statusPill(s: Promotion['status']): { label: string; cls: string } {
  if (s === 'active')  return { label: 'En cours',  cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' }
  if (s === 'future')  return { label: 'À venir',   cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }
  return { label: 'Expirée', cls: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400' }
}
</script>

<template>
  <div class="px-6 py-6">
    
    <div class="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-slate-100">Promotions</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Remises produit — par produit ou par catégorie, avec période et type (% ou €).
        </p>
      </div>
      <button
        @click="openCreate"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        Nouvelle promotion
      </button>
    </div>

    
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden text-xs">
        <button
          v-for="s in (['active','future','expired','all'] as const)"
          :key="s"
          @click="status = s; offset = 0"
          :class="[
            'px-3 py-1.5 font-medium transition-colors',
            status === s
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
          ]"
        >
          {{ s === 'active' ? 'En cours' : s === 'future' ? 'À venir' : s === 'expired' ? 'Expirées' : 'Toutes' }}
        </button>
      </div>
      <input
        v-model="search"
        @input="offset = 0"
        type="text" placeholder="Recherche produit (nom ou ref)…"
        class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-64 bg-white dark:bg-slate-900"
      />
      <span class="text-xs text-gray-400 ml-auto">{{ total }} promotion{{ total > 1 ? 's' : '' }}</span>
    </div>

    
    <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase text-gray-500 dark:text-slate-400">
          <tr>
            <th class="text-left px-4 py-2 font-semibold">Produit</th>
            <th class="text-left px-4 py-2 font-semibold">Réduction</th>
            <th class="text-left px-4 py-2 font-semibold">Période</th>
            <th class="text-left px-4 py-2 font-semibold">Qté min</th>
            <th class="text-left px-4 py-2 font-semibold">Groupe</th>
            <th class="text-left px-4 py-2 font-semibold">Statut</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
          <tr v-if="pending">
            <td colspan="7" class="text-center py-8 text-xs text-gray-400">Chargement…</td>
          </tr>
          <tr v-else-if="!promotions.length">
            <td colspan="7" class="text-center py-8 text-xs text-gray-400">
              Aucune promotion {{ status === 'all' ? '' : status === 'active' ? 'active' : status === 'future' ? 'à venir' : 'expirée' }}.
            </td>
          </tr>
          <tr v-for="p in promotions" :key="p.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
            <td class="px-4 py-2.5">
              <div class="font-medium text-gray-800 dark:text-slate-200 line-clamp-1">{{ p.productName || `Produit #${p.idProduct}` }}</div>
              <div v-if="p.productRef" class="text-[11px] font-mono text-gray-400">{{ p.productRef }}</div>
            </td>
            <td class="px-4 py-2.5">
              <span class="font-semibold text-red-600 dark:text-red-400">{{ fmtReduction(p) }}</span>
              <span class="text-[11px] text-gray-400 ml-1">{{ p.reductionTax ? 'TTC' : 'HT' }}</span>
            </td>
            <td class="px-4 py-2.5 text-gray-600 dark:text-slate-300">
              {{ fmtDate(p.dateFrom) }} → {{ fmtDate(p.dateTo) }}
            </td>
            <td class="px-4 py-2.5 text-gray-600 dark:text-slate-300">{{ p.fromQuantity }}</td>
            <td class="px-4 py-2.5 text-gray-600 dark:text-slate-300">{{ p.idGroup === 0 ? 'Tous' : `#${p.idGroup}` }}</td>
            <td class="px-4 py-2.5">
              <span :class="['inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold', statusPill(p.status).cls]">
                {{ statusPill(p.status).label }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-right whitespace-nowrap">
              <button @click="openEdit(p)" class="text-xs text-primary-600 hover:text-primary-700 mr-3">Éditer</button>
              <button @click="deletePromo(p)" class="text-xs text-red-600 hover:text-red-700">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    
    <div v-if="total > limit" class="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
      <span>{{ offset + 1 }} – {{ Math.min(offset + limit, total) }} sur {{ total }}</span>
      <div class="flex gap-2">
        <button :disabled="offset === 0" @click="offset = Math.max(0, offset - limit)" class="px-3 py-1 border border-gray-200 dark:border-slate-700 rounded disabled:opacity-50">Précédent</button>
        <button :disabled="offset + limit >= total" @click="offset = offset + limit" class="px-3 py-1 border border-gray-200 dark:border-slate-700 rounded disabled:opacity-50">Suivant</button>
      </div>
    </div>

    
    <div v-if="form.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="bg-white dark:bg-slate-900 w-full max-w-xl rounded-xl shadow-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-gray-900 dark:text-slate-100">
            {{ form.editId ? 'Éditer la promotion' : 'Nouvelle promotion' }}
          </h2>
          <button @click="closeForm" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">✕</button>
        </div>

        <form @submit.prevent="submitForm" class="space-y-4">
          
          <div v-if="!form.editId" class="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              @click="form.mode = 'product'"
              :class="['flex-1 py-2 text-sm font-medium transition-colors', form.mode === 'product' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300']"
            >Produit ciblé</button>
            <button
              type="button"
              @click="form.mode = 'category'"
              :class="['flex-1 py-2 text-sm font-medium transition-colors', form.mode === 'category' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300']"
            >Catégorie entière</button>
          </div>

          
          <div v-if="form.mode === 'product' || form.editId">
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Produit</label>
            <div v-if="form.editId || form.idProduct" class="text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2">
              {{ form.productLabel || `#${form.idProduct}` }}
              <button v-if="!form.editId" type="button" @click="form.idProduct = null; form.productLabel = ''" class="ml-2 text-xs text-red-600">retirer</button>
            </div>
            <div v-else class="relative">
              <input
                v-model="form.productSearch"
                type="text" placeholder="Rechercher produit (nom, ref)…"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
              />
              <ul v-if="productResults.length" class="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow max-h-56 overflow-auto">
                <li
                  v-for="p in productResults" :key="p.id"
                  @click="selectProduct(p)"
                  class="px-3 py-1.5 text-xs cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30"
                >
                  <span class="font-medium">{{ p.name }}</span>
                  <span class="ml-2 text-gray-400">#{{ p.id }}{{ p.reference ? ' · ' + p.reference : '' }}</span>
                </li>
              </ul>
            </div>
          </div>

          
          <div v-else>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Catégorie (subtree inclus)</label>
            <select
              v-model.number="form.idCategory"
              @change="form.categoryLabel = (categories.find(c => c.id === form.idCategory)?.name) || ''"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
            >
              <option :value="null">— Choisir —</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">
                {{ '— '.repeat(c.depth) }}{{ c.name }}
              </option>
            </select>
            <p class="text-[11px] text-gray-400 mt-1">Crée une promo individuelle pour chaque produit actif de la catégorie.</p>
          </div>

          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Type</label>
              <select
                v-model="form.reductionType"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
              >
                <option value="percentage">Pourcentage</option>
                <option value="amount">Montant fixe</option>
              </select>
            </div>
            <div v-if="form.reductionType === 'percentage'">
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">% de réduction</label>
              <input v-model.number="form.reductionPct" type="number" min="0.01" max="99.99" step="0.5" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
            </div>
            <div v-else>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Montant (€)</label>
              <input v-model.number="form.reductionAmount" type="number" min="0.01" step="0.01" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
            </div>
          </div>

          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Du (vide = toujours)</label>
              <input v-model="form.dateFrom" type="date" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Au (vide = jamais)</label>
              <input v-model="form.dateTo" type="date" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
            </div>
          </div>

          
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Qté min</label>
              <input v-model.number="form.fromQuantity" type="number" min="1" step="1" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Groupe client</label>
              <input v-model.number="form.idGroup" type="number" min="0" step="1" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800" />
              <p class="text-[10px] text-gray-400 mt-0.5">0 = tous</p>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300">
                <input type="checkbox" :checked="form.reductionTax === 1" @change="form.reductionTax = ($event.target as HTMLInputElement).checked ? 1 : 0" />
                Inclure TVA (TTC)
              </label>
            </div>
          </div>

          <p v-if="form.error" class="text-xs text-red-600">{{ form.error }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closeForm" class="px-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" :disabled="form.saving" class="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold disabled:opacity-50">
              {{ form.saving ? 'Enregistrement…' : (form.editId ? 'Enregistrer' : 'Créer') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
