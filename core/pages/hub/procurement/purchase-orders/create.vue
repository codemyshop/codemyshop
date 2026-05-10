<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  PRM — Création d'un bon de commande.
  Sélection fournisseur → produits rattachés à ce fournisseur → quantités/prix → création BC.
-->
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <NuxtLink to="/hub/procurement/purchase-orders" class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 inline-flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Bons de commande
        </NuxtLink>
        <span class="text-gray-300 dark:text-slate-700">/</span>
        <h1 class="text-lg font-bold">Nouveau BC</h1>
      </div>
    </header>

    <div class="p-6 max-w-4xl mx-auto space-y-6">

      <!-- 1. Fournisseur + livraison -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 class="text-sm font-bold">1 · Fournisseur</h2>
          <p class="text-xs text-gray-500 mt-0.5">Sélection du fournisseur et date de livraison prévisionnelle</p>
        </div>
        <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Fournisseur *</label>
            <select v-model="idSupplier" @change="loadSupplierProducts"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900">
              <option :value="0">— Choisir —</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }} ({{ s.productCount }} produits)</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Livraison prévue</label>
            <input v-model="deliveryDate" type="date" min="2026-01-01"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
          </div>
        </div>
      </div>

      <!-- 2. Produits -->
      <div v-if="idSupplier" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold">2 · Produits</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ lines.length }} ligne(s) · produits référencés chez ce fournisseur</p>
          </div>
          <div class="flex items-center gap-2">
            <input v-model="productSearch" @input="debouncedSearch" type="text" placeholder="Ajouter un produit…"
              class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-52 bg-white dark:bg-slate-900" />
          </div>
        </div>

        <!-- Search results -->
        <div v-if="searchResults.length" class="border-b border-gray-100 dark:border-slate-800 max-h-48 overflow-auto bg-gray-50 dark:bg-slate-800/30">
          <button v-for="p in searchResults" :key="p.id" @click="addLine(p)"
            class="w-full text-left px-4 py-2 text-xs hover:bg-white dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-b-0 flex items-center justify-between">
            <div>
              <span class="font-semibold">{{ p.name }}</span>
              <span class="text-gray-400 ml-2 font-mono text-[10px]">{{ p.reference || `#${p.id}` }}</span>
            </div>
            <span class="text-[11px] text-gray-500 tabular-nums">{{ fmtEur(p.defaultPrice) }}</span>
          </button>
        </div>

        <!-- Lignes -->
        <table class="min-w-full text-xs">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-gray-500">Produit</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-500 w-24">Qté</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-500 w-32">PU HT</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-500 w-32">Total HT</th>
              <th class="w-10" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
            <tr v-if="!lines.length">
              <td colspan="5" class="px-4 py-8 text-center text-gray-400">
                Recherche ci-dessus pour ajouter un produit.
              </td>
            </tr>
            <tr v-for="(l, i) in lines" :key="l.idProduct" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
              <td class="px-4 py-2">
                <p class="font-semibold">{{ l.name }}</p>
                <p class="text-[10px] text-gray-400 font-mono">{{ l.reference || `#${l.idProduct}` }}</p>
              </td>
              <td class="px-4 py-2">
                <input v-model.number="l.quantity" type="number" min="1"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900 text-right tabular-nums" />
              </td>
              <td class="px-4 py-2">
                <input v-model.number="l.unitPriceTE" type="number" min="0" step="0.01"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900 text-right tabular-nums" />
              </td>
              <td class="px-4 py-2 text-right font-bold tabular-nums">{{ fmtEur((l.quantity || 0) * (l.unitPriceTE || 0)) }}</td>
              <td class="px-2 text-right">
                <button @click="lines.splice(i, 1)" class="text-danger-500 hover:text-danger-700 text-base leading-none">×</button>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="lines.length" class="bg-gray-50 dark:bg-slate-800/50 font-bold">
            <tr>
              <td colspan="3" class="px-4 py-3 text-right text-gray-600 dark:text-slate-300">Total HT</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ fmtEur(totalHT) }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- 3. Validation -->
      <div v-if="idSupplier" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm flex items-center justify-between">
        <div>
          <p v-if="error" class="text-xs text-danger-600">{{ error }}</p>
          <p v-else class="text-xs text-gray-500">Le BC sera créé en état « En cours de création » (modifiable).</p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/hub/procurement/purchase-orders"
            class="text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-800 px-3 py-1.5">Annuler</NuxtLink>
          <button @click="createBC" :disabled="!canSubmit || saving"
            class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white">
            {{ saving ? 'Création…' : `Créer le BC (${lines.length} ligne(s))` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface Line { idProduct: number; name: string; reference: string; quantity: number; unitPriceTE: number }
interface SearchResult { id: number; name: string; reference: string; defaultPrice: number }

const suppliers = ref<Array<{ id: number; name: string; productCount: number }>>([])
const idSupplier = ref(0)
const deliveryDate = ref('')
const lines = ref<Line[]>([])
const productSearch = ref('')
const searchResults = ref<SearchResult[]>([])
const supplierProducts = ref<SearchResult[]>([])
const saving = ref(false)
const error = ref('')

const totalHT = computed(() => lines.value.reduce((s, l) => s + (l.quantity || 0) * (l.unitPriceTE || 0), 0))
const canSubmit = computed(() => idSupplier.value > 0 && lines.value.length > 0 && lines.value.every(l => l.quantity > 0))

const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

async function loadSuppliers() {
  try {
    const data = await $fetch<any>('/api/bo/procurement/suppliers')
    suppliers.value = (data?.suppliers || []).filter((s: any) => s.active)
  } catch { suppliers.value = [] }
}

async function loadSupplierProducts() {
  lines.value = []
  searchResults.value = []
  productSearch.value = ''
  if (!idSupplier.value) { supplierProducts.value = []; return }
  try {
    const detail = await $fetch<any>(`/api/bo/procurement/suppliers/${idSupplier.value}`)
    supplierProducts.value = (detail?.products || []).map((p: any) => ({
      id: p.id, name: p.name, reference: p.reference, defaultPrice: p.priceTE,
    }))
  } catch { supplierProducts.value = [] }
}

let debounceTimer: any = null
function debouncedSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const q = productSearch.value.trim().toLowerCase()
    if (!q || q.length < 2) { searchResults.value = []; return }
    searchResults.value = supplierProducts.value
      .filter(p => !lines.value.some(l => l.idProduct === p.id))
      .filter(p => p.name.toLowerCase().includes(q) || (p.reference || '').toLowerCase().includes(q))
      .slice(0, 10)
  }, 200)
}

function addLine(p: SearchResult) {
  if (lines.value.some(l => l.idProduct === p.id)) return
  lines.value.push({
    idProduct: p.id, name: p.name, reference: p.reference,
    quantity: 1, unitPriceTE: p.defaultPrice || 0,
  })
  productSearch.value = ''
  searchResults.value = []
}

async function createBC() {
  error.value = ''
  if (!canSubmit.value) return
  saving.value = true
  try {
    const res = await $fetch<any>('/api/bo/procurement/purchase-orders', {
      method: 'POST',
      body: {
        idSupplier: idSupplier.value,
        deliveryDate: deliveryDate.value || null,
        lines: lines.value.map(l => ({
          idProduct: l.idProduct,
          quantity: l.quantity,
          unitPriceTE: l.unitPriceTE,
        })),
      },
    })
    navigateTo(`/hub/procurement/purchase-orders/${res.id}`)
  } catch (e: any) {
    error.value = e?.statusMessage || 'Erreur lors de la création'
  } finally { saving.value = false }
}

onMounted(loadSuppliers)
</script>
