<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Poids Variable (Catch Weight)</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ pending.length }} à peser · {{ weighed.length }} pesée{{ weighed.length > 1 ? 's' : '' }} récente{{ weighed.length > 1 ? 's' : '' }} · {{ products.length }} produit{{ products.length > 1 ? 's' : '' }} flaggé{{ products.length > 1 ? 's' : '' }}</p>
      </div>
      <div class="flex gap-2">
        <button @click="openFlag(null)" class="text-xs px-3 py-1.5 bg-gray-800 dark:bg-slate-700 text-white rounded-lg hover:bg-gray-900 font-semibold">+ Flag produit</button>
        <button @click="openSeed" class="text-xs px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-800">+ Ligne démo</button>
        <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Actualiser</button>
      </div>
    </header>

    <div class="flex-1 overflow-auto p-6 space-y-6">

      <!-- Weighing queue -->
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">⚖️ En attente de pesée</h2>
        <div v-if="loading" class="h-24 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div v-else-if="!pending.length" class="py-10 text-center text-xs text-gray-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
          Aucune pesée en attente. Les lignes commandées apparaissent ici automatiquement.
        </div>
        <table v-else class="w-full text-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium">Commande</th>
              <th class="px-4 py-2.5 font-medium">Produit</th>
              <th class="px-4 py-2.5 font-medium text-right">Qté cmd</th>
              <th class="px-4 py-2.5 font-medium text-right">Poids cmd</th>
              <th class="px-4 py-2.5 font-medium text-right">€ / kg</th>
              <th class="px-4 py-2.5 font-medium text-right">Montant cmd</th>
              <th class="px-4 py-2.5 font-medium text-right">Pesée (kg)</th>
              <th class="px-4 py-2.5 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pending" :key="p.id" class="border-t border-gray-50 dark:border-slate-800/50 hover:bg-primary-50/20">
              <td class="px-4 py-2 font-mono text-xs text-primary-600">#{{ p.idOrder || '—' }}</td>
              <td class="px-4 py-2 text-xs text-gray-800 dark:text-slate-100">{{ p.productName || `#${p.idProduct}` }}</td>
              <td class="px-4 py-2 text-right font-mono text-xs">{{ formatNum(p.quantityOrdered) }}</td>
              <td class="px-4 py-2 text-right font-mono text-xs">{{ formatNum(p.weightOrderedKg) }}&nbsp;kg</td>
              <td class="px-4 py-2 text-right font-mono text-xs">{{ formatEur(p.pricePerKgHt) }}</td>
              <td class="px-4 py-2 text-right font-mono text-xs font-semibold">{{ formatEur(p.priceOrderedHt) }}</td>
              <td class="px-4 py-2 text-right">
                <input v-model.number="weighInputs[p.id]" type="number" step="0.001" min="0" class="w-24 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-right font-mono text-xs" />
              </td>
              <td class="px-4 py-2 text-right">
                <button @click="submitWeigh(p)" :disabled="!weighInputs[p.id]" class="text-[10px] px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-40">
                  Valider
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Historique -->
      <section v-if="weighed.length">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">📊 Pesées récentes (50)</h2>
        <table class="w-full text-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium">Cmd</th>
              <th class="px-4 py-2.5 font-medium">Produit</th>
              <th class="px-4 py-2.5 font-medium text-right">Cmd (kg)</th>
              <th class="px-4 py-2.5 font-medium text-right">Pesée (kg)</th>
              <th class="px-4 py-2.5 font-medium text-right">Écart</th>
              <th class="px-4 py-2.5 font-medium text-right">Facturé</th>
              <th class="px-4 py-2.5 font-medium text-right">Delta €</th>
              <th class="px-4 py-2.5 font-medium">Agent</th>
              <th class="px-4 py-2.5 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in weighed" :key="w.id" class="border-t border-gray-50 dark:border-slate-800/50">
              <td class="px-4 py-2 font-mono text-xs text-primary-600">#{{ w.idOrder || '—' }}</td>
              <td class="px-4 py-2 text-xs">{{ w.productName || `#${w.idProduct}` }}</td>
              <td class="px-4 py-2 text-right font-mono text-xs">{{ formatNum(w.weightOrderedKg) }}</td>
              <td class="px-4 py-2 text-right font-mono text-xs font-semibold">{{ formatNum(w.weightShippedKg) }}</td>
              <td class="px-4 py-2 text-right">
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-full" :class="deltaBadge(deltaPct(w))">{{ formatPct(deltaPct(w)) }}%</span>
              </td>
              <td class="px-4 py-2 text-right font-mono text-xs">{{ formatEur(w.priceFinalHt) }}</td>
              <td class="px-4 py-2 text-right font-mono text-xs font-semibold" :class="Number(w.deltaHt) > 0 ? 'text-success-600' : (Number(w.deltaHt) < 0 ? 'text-danger-500' : 'text-gray-400')">
                {{ Number(w.deltaHt) > 0 ? '+' : '' }}{{ formatEur(w.deltaHt) }}
              </td>
              <td class="px-4 py-2 text-xs text-gray-500">{{ w.employeeName || `#${w.idEmployee || '—'}` }}</td>
              <td class="px-4 py-2 text-xs text-gray-500">{{ formatDate(w.weighedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Flagged products -->
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">🏷️ Produits au poids variable</h2>
        <div v-if="!products.length" class="py-10 text-center text-xs text-gray-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
          Aucun produit flaggé. Ajoute un flag pour activer la pesée sur ce produit.
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div v-for="pr in products" :key="pr.idProduct" class="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-4 group relative">
            <div class="flex items-start justify-between mb-2">
              <p class="text-xs font-semibold text-gray-800 dark:text-slate-100">{{ pr.productName || `#${pr.idProduct}` }}</p>
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="pr.isActive ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-400'">
                {{ pr.isActive ? 'actif' : 'inactif' }}
              </span>
            </div>
            <div class="text-[10px] text-gray-500 space-y-0.5">
              <p>Poids nominal : <span class="font-mono">{{ formatNum(pr.nominalWeightKg) }} kg</span></p>
              <p>Prix unité : <span class="font-mono">{{ pr.priceUnit }}</span></p>
              <p>Tolérance : <span class="font-mono">{{ formatPct(pr.tolerancePct) }}%</span></p>
            </div>
            <div class="absolute top-2 right-2 hidden group-hover:flex gap-1">
              <button @click="openFlag(pr)" class="text-[10px] px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded hover:text-primary-600" title="Éditer">✎</button>
              <button @click="deleteFlag(pr)" class="text-[10px] px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded hover:text-danger-500" title="Retirer">✕</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Modal flag produit -->
    <div v-if="flagModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="flagModalOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md mx-4">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ flagForm.idProduct && products.some(p => p.idProduct === flagForm.idProduct) ? 'Éditer le flag' : 'Nouveau flag poids variable' }}</h2>
          <button @click="flagModalOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitFlag" class="p-5 space-y-3">
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">ID Produit *</span>
            <input v-model.number="flagForm.idProduct" type="number" min="1" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Poids nominal (kg) *</span>
              <input v-model.number="flagForm.nominalWeightKg" type="number" step="0.001" min="0.001" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Prix unité</span>
              <select v-model="flagForm.priceUnit" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5">
                <option value="kg">kg</option>
                <option value="piece">piece</option>
                <option value="lot">lot</option>
              </select>
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Tolérance (%)</span>
              <input v-model.number="flagForm.tolerancePct" type="number" step="0.1" min="0" max="100" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs flex items-center gap-2 mt-4">
              <input v-model="flagForm.isActive" type="checkbox" :true-value="1" :false-value="0" />
              <span class="text-gray-500 dark:text-slate-400">Flag actif</span>
            </label>
          </div>
          <p v-if="flagError" class="text-xs text-danger-500">{{ flagError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="flagModalOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" :disabled="flagSaving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">{{ flagSaving ? 'Enreg…' : 'Enregistrer' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Demo seed modal -->
    <div v-if="seedModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="seedModalOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md mx-4">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Ligne de démo (sans commande)</h2>
          <button @click="seedModalOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitSeed" class="p-5 space-y-3">
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">ID Produit *</span>
            <input v-model.number="seedForm.idProduct" type="number" min="1" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <div class="grid grid-cols-3 gap-3">
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Qté cmd</span>
              <input v-model.number="seedForm.quantityOrdered" type="number" min="1" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Poids cmd (kg) *</span>
              <input v-model.number="seedForm.weightOrderedKg" type="number" step="0.001" min="0.001" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Prix €/kg *</span>
              <input v-model.number="seedForm.pricePerKgHt" type="number" step="0.01" min="0" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
          </div>
          <p class="text-[10px] text-amber-600">💡 Ligne de démo sans commande (id_order=0) — retirer en prod via WMS flow normal.</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="seedModalOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold">Créer</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface FlaggedProduct {
  idProduct: number; productName: string | null; reference: string | null
  isActive: number; nominalWeightKg: number; priceUnit: string; tolerancePct: number
}
interface PendingLine {
  id: number; idOrder: number; idOrderDetail: number; idProduct: number; productName: string | null
  quantityOrdered: number; weightOrderedKg: number; pricePerKgHt: number; priceOrderedHt: number
  customerName: string | null
}
interface WeighedLine extends PendingLine {
  weightShippedKg: number; priceFinalHt: number; deltaHt: number
  weighedAt: string; idEmployee: number | null; employeeName: string | null
}

const products = ref<FlaggedProduct[]>([])
const pending = ref<PendingLine[]>([])
const weighed = ref<WeighedLine[]>([])
const loading = ref(true)

const weighInputs = ref<Record<number, number>>({})

const flagModalOpen = ref(false)
const flagForm = ref({ idProduct: 0, nominalWeightKg: 1, priceUnit: 'kg' as 'kg' | 'piece' | 'lot', tolerancePct: 5, isActive: 1 as 0 | 1 })
const flagError = ref('')
const flagSaving = ref(false)

const seedModalOpen = ref(false)
const seedForm = ref({ idProduct: 1, quantityOrdered: 1, weightOrderedKg: 10, pricePerKgHt: 12 })

function formatNum(n: any) { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(Number(n || 0)) }
function formatEur(n: any) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n || 0)) }
function formatPct(n: any) { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(n || 0)) }
function formatDate(s: string | null | undefined) {
  if (!s) return '—'
  try { return new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) } catch { return s }
}
function deltaPct(w: WeighedLine): number {
  const o = Number(w.weightOrderedKg || 0)
  const s = Number(w.weightShippedKg || 0)
  if (!o) return 0
  return ((s - o) / o) * 100
}
function deltaBadge(pct: number): string {
  const abs = Math.abs(pct)
  if (abs < 2) return 'bg-success-100 text-success-600'
  if (abs < 5) return 'bg-amber-100 text-amber-700'
  return 'bg-danger-100 text-danger-600'
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/bo/catch-weight')
    products.value = res.products || []
    pending.value = res.pending || []
    weighed.value = res.weighed || []
  } catch (e) {
    console.error('catch-weight load failed', e)
  } finally {
    loading.value = false
  }
}

async function submitWeigh(p: PendingLine) {
  const w = weighInputs.value[p.id]
  if (!w || w <= 0) return
  try {
    await $fetch('/api/bo/catch-weight/weigh', {
      method: 'POST',
      body: { idLineWeight: p.id, weightShippedKg: w },
    })
    delete weighInputs.value[p.id]
    await load()
  } catch (e: any) {
    alert(`Erreur pesée : ${e?.data?.statusMessage || e?.message}`)
  }
}

function openFlag(p: FlaggedProduct | null) {
  flagError.value = ''
  flagForm.value = p
    ? { idProduct: p.idProduct, nominalWeightKg: Number(p.nominalWeightKg), priceUnit: p.priceUnit as any, tolerancePct: Number(p.tolerancePct), isActive: p.isActive ? 1 : 0 }
    : { idProduct: 0, nominalWeightKg: 1, priceUnit: 'kg', tolerancePct: 5, isActive: 1 }
  flagModalOpen.value = true
}
async function submitFlag() {
  flagSaving.value = true
  flagError.value = ''
  try {
    await $fetch('/api/bo/catch-weight/flag', { method: 'POST', body: flagForm.value })
    flagModalOpen.value = false
    await load()
  } catch (e: any) {
    flagError.value = e?.data?.statusMessage || e?.message || 'Erreur inconnue'
  } finally {
    flagSaving.value = false
  }
}
async function deleteFlag(p: FlaggedProduct) {
  if (!confirm(`Retirer le flag poids variable de "${p.productName}" ?`)) return
  try {
    await $fetch(`/api/bo/catch-weight/flag/${p.idProduct}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

function openSeed() {
  seedForm.value = { idProduct: 1, quantityOrdered: 1, weightOrderedKg: 10, pricePerKgHt: 12 }
  seedModalOpen.value = true
}
async function submitSeed() {
  try {
    await $fetch('/api/bo/catch-weight/seed-demo', { method: 'POST', body: seedForm.value })
    seedModalOpen.value = false
    await load()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

onMounted(load)
</script>
