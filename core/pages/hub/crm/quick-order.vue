<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Commande Rapide B2B</h1>
        <p class="text-xs text-gray-400 mt-0.5">Saisie matrice · Import email / CSV · Listes persistées · Re-commande</p>
      </div>
      <button @click="loadLists" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Actualiser</button>
    </header>

    <div class="flex-1 overflow-auto p-6 space-y-6">

      <!-- ─── Matrice saisie + paste ──────────────────────────────── -->
      <section class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">⚡ Saisie matrice / Import</h2>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <!-- Zone paste texte libre -->
          <div>
            <label class="text-xs block mb-1 text-gray-500 dark:text-slate-400">Coller texte / email / CSV (SKU + qté par ligne)</label>
            <textarea
              v-model="pasteText"
              rows="8"
              class="w-full border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-mono"
              placeholder="3611;10&#10;ALMOND-500 x 25&#10;DATTE-MEDJ : 5&#10;..."
            />
            <div class="flex gap-2 mt-2">
              <button @click="parseAndFill" :disabled="!pasteText.trim() || parsing" class="text-xs px-3 py-1.5 bg-gray-800 dark:bg-slate-700 text-white rounded hover:bg-gray-900 font-semibold disabled:opacity-50">
                {{ parsing ? 'Parse…' : 'Parser → matrice' }}
              </button>
              <button @click="clearAll" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800">
                Vider
              </button>
            </div>
            <p v-if="parseSkipped.length" class="text-[10px] text-amber-600 mt-2">
              {{ parseSkipped.length }} ligne{{ parseSkipped.length > 1 ? 's' : '' }} non parsée{{ parseSkipped.length > 1 ? 's' : '' }} :
              <span class="font-mono">{{ parseSkipped.slice(0, 3).join(' · ') }}{{ parseSkipped.length > 3 ? '…' : '' }}</span>
            </p>
          </div>

          <!-- Client + actions -->
          <div>
            <label class="text-xs block mb-1 text-gray-500 dark:text-slate-400">Client (pour résolution prix B2B)</label>
            <input v-model.number="idCustomer" type="number" min="0" placeholder="0 = pas de résolution B2B" class="w-full border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs" />

            <label class="text-xs block mt-3 mb-1 text-gray-500 dark:text-slate-400">Re-commande depuis ID commande</label>
            <div class="flex gap-2">
              <input v-model.number="reorderId" type="number" min="1" placeholder="Ex: 142" class="flex-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs" />
              <button @click="reorderFromOrder" :disabled="!reorderId || reordering" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">
                {{ reordering ? '…' : 'Charger' }}
              </button>
            </div>

            <div class="mt-4 flex gap-2 flex-wrap">
              <button @click="resolveBulk" :disabled="!matrixItems.length || resolving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">
                {{ resolving ? 'Résolution…' : `Résoudre ${matrixItems.length} ligne(s)` }}
              </button>
              <button v-if="resolvedData" @click="openSaveModal" class="text-xs px-3 py-1.5 border border-primary-600 text-primary-600 rounded hover:bg-primary-50 dark:hover:bg-slate-800 font-semibold">
                💾 Enregistrer en liste
              </button>
            </div>
          </div>
        </div>

        <!-- Editable matrix -->
        <div v-if="matrixItems.length" class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-semibold text-gray-600 dark:text-slate-400">Matrice ({{ matrixItems.length }} ligne{{ matrixItems.length > 1 ? 's' : '' }})</h3>
            <button @click="addRow" class="text-[10px] px-2 py-0.5 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800">+ ligne</button>
          </div>
          <table class="w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50">
              <tr class="text-left text-[10px] text-gray-400 uppercase tracking-wider">
                <th class="px-3 py-2 font-medium w-10">#</th>
                <th class="px-3 py-2 font-medium">SKU</th>
                <th class="px-3 py-2 font-medium text-right w-24">Qté</th>
                <th class="px-3 py-2 font-medium text-right w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, i) in matrixItems" :key="i" class="border-t border-gray-50 dark:border-slate-800/50">
                <td class="px-3 py-1.5 text-gray-400 font-mono">{{ i + 1 }}</td>
                <td class="px-3 py-1.5">
                  <input v-model="it.sku" type="text" class="w-full border border-gray-200 dark:border-slate-700 rounded px-2 py-1 font-mono" />
                </td>
                <td class="px-3 py-1.5">
                  <input v-model.number="it.qty" type="number" step="0.001" min="0.001" class="w-full border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-right font-mono" />
                </td>
                <td class="px-3 py-1.5 text-right">
                  <button @click="matrixItems.splice(i, 1)" class="text-[10px] text-gray-400 hover:text-danger-500">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ─── Resolution result ──────────────────────────────── -->
      <section v-if="resolvedData">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">📦 Résolution panier</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-3">
            <p class="text-[10px] text-gray-400 uppercase">Résolues</p>
            <p class="text-lg font-bold text-success-600">{{ resolvedData.totals.nbResolved }}</p>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-3">
            <p class="text-[10px] text-gray-400 uppercase">Non trouvées</p>
            <p class="text-lg font-bold" :class="resolvedData.totals.nbNotFound ? 'text-danger-500' : 'text-gray-400'">{{ resolvedData.totals.nbNotFound }}</p>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-3">
            <p class="text-[10px] text-gray-400 uppercase">Qté totale</p>
            <p class="text-lg font-bold text-gray-800 dark:text-slate-100 font-mono">{{ formatNum(resolvedData.totals.totalQuantity) }}</p>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-3">
            <p class="text-[10px] text-gray-400 uppercase">Total HT</p>
            <p class="text-lg font-bold text-primary-700 dark:text-primary-300 font-mono">{{ formatEur(resolvedData.totals.totalHt) }}</p>
          </div>
        </div>

        <table class="w-full text-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium">SKU</th>
              <th class="px-4 py-2.5 font-medium">Produit</th>
              <th class="px-4 py-2.5 font-medium text-right">Qté</th>
              <th class="px-4 py-2.5 font-medium text-right">PU HT</th>
              <th class="px-4 py-2.5 font-medium text-center">Source prix</th>
              <th class="px-4 py-2.5 font-medium text-right">Stock</th>
              <th class="px-4 py-2.5 font-medium text-center">Statut</th>
              <th class="px-4 py-2.5 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in resolvedData.resolved" :key="i" class="border-t border-gray-50 dark:border-slate-800/50">
              <td class="px-4 py-2 font-mono text-xs font-semibold text-primary-600">{{ r.sku }}</td>
              <td class="px-4 py-2 text-xs text-gray-800 dark:text-slate-100">{{ r.productName || `#${r.idProduct}` }}</td>
              <td class="px-4 py-2 text-right font-mono text-xs">{{ formatNum(r.qty) }}</td>
              <td class="px-4 py-2 text-right font-mono text-xs font-semibold">{{ formatEur(r.unitPriceHt) }}</td>
              <td class="px-4 py-2 text-center">
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="sourceBadge(r.priceSource)" :title="r.priceLabel">{{ r.priceSource }}</span>
              </td>
              <td class="px-4 py-2 text-right font-mono text-xs" :class="r.stock >= r.qty ? 'text-gray-600' : 'text-danger-500 font-semibold'">{{ formatNum(r.stock) }}</td>
              <td class="px-4 py-2 text-center">
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="statusBadge(r.status)">{{ statusLabel(r.status) }}</span>
              </td>
              <td class="px-4 py-2 text-right font-mono text-xs font-semibold">{{ formatEur(r.lineTotalHt) }}</td>
            </tr>
            <tr v-for="(nf, i) in resolvedData.notFound" :key="`nf-${i}`" class="border-t border-gray-50 dark:border-slate-800/50 bg-danger-50/30 dark:bg-danger-900/10">
              <td class="px-4 py-2 font-mono text-xs font-semibold text-danger-600">{{ nf.sku }}</td>
              <td class="px-4 py-2 text-xs text-danger-500 italic" colspan="6">
                Non trouvé ({{ nf.reason === 'not_in_catalog' ? 'absent du catalogue' : nf.reason }})
              </td>
              <td class="px-4 py-2 text-right font-mono text-xs text-gray-400">—</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ─── Persisted lists ──────────────────────────────── -->
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">💾 Listes persistées</h2>
        <div v-if="loadingLists" class="h-20 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div v-else-if="!persistedLists.length" class="py-10 text-center text-xs text-gray-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
          Aucune liste persistée. Résolvez une matrice et enregistrez-la pour commencer.
        </div>
        <table v-else class="w-full text-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium">Nom</th>
              <th class="px-4 py-2.5 font-medium">Client</th>
              <th class="px-4 py-2.5 font-medium text-center">Lignes</th>
              <th class="px-4 py-2.5 font-medium text-center">Défaut</th>
              <th class="px-4 py-2.5 font-medium">Mise à jour</th>
              <th class="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in persistedLists" :key="l.id" class="border-t border-gray-50 dark:border-slate-800/50 hover:bg-primary-50/20 dark:hover:bg-primary-900/10">
              <td class="px-4 py-2 font-semibold text-gray-800 dark:text-slate-100">{{ l.name }}</td>
              <td class="px-4 py-2 text-xs text-gray-600 dark:text-slate-400">{{ l.customerName || `#${l.idCustomer}` }}</td>
              <td class="px-4 py-2 text-center font-mono text-xs">{{ l.nbLines }}</td>
              <td class="px-4 py-2 text-center">
                <span v-if="l.isDefault" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">défaut</span>
              </td>
              <td class="px-4 py-2 text-xs text-gray-500">{{ formatDate(l.dateUpd) }}</td>
              <td class="px-4 py-2 text-right">
                <div class="flex justify-end gap-1">
                  <button @click="loadList(l.id)" class="text-[10px] px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:text-primary-600" title="Charger">↺</button>
                  <button @click="deleteList(l)" class="text-[10px] px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:text-danger-500" title="Supprimer">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- ─── Modal enregistrer liste ──────────────────────────────── -->
    <div v-if="saveModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="saveModalOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md mx-4">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Enregistrer la liste</h2>
          <button @click="saveModalOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitSave" class="p-5 space-y-3">
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Client *</span>
            <input v-model.number="saveForm.idCustomer" type="number" min="1" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Nom de la liste *</span>
            <input v-model="saveForm.name" required maxlength="128" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="Commande hebdo, Stock frais, etc." />
          </label>
          <label class="text-xs flex items-center gap-2">
            <input v-model="saveForm.isDefault" type="checkbox" :true-value="1" :false-value="0" />
            <span class="text-gray-500 dark:text-slate-400">Liste par défaut pour ce client</span>
          </label>
          <p v-if="saveError" class="text-xs text-danger-500">{{ saveError }}</p>
          <p class="text-xs text-gray-500">{{ resolvedData?.resolved.length || 0 }} ligne(s) résolue(s) seront enregistrées.</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="saveModalOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" :disabled="saving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">{{ saving ? 'Enreg…' : 'Enregistrer' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface MatrixItem { sku: string; qty: number }
interface Resolved {
  sku: string; qty: number; idProduct: number; idProductAttribute: number
  productName: string | null; reference: string | null
  unitPriceHt: number; priceSource: string; priceLabel: string
  stock: number; status: string; lineTotalHt: number
}
interface NotFound { sku: string; qty: number; reason: string }
interface Totals { totalHt: number; totalQuantity: number; nbResolved: number; nbNotFound: number }
interface PersistedList {
  id: number; idCustomer: number; customerName: string | null; customerEmail: string | null
  name: string; isDefault: number; active: number; dateAdd: string; dateUpd: string; nbLines: number
}

const pasteText = ref('')
const parsing = ref(false)
const parseSkipped = ref<string[]>([])

const matrixItems = ref<MatrixItem[]>([])
const idCustomer = ref(0)

const reorderId = ref<number | null>(null)
const reordering = ref(false)

const resolving = ref(false)
const resolvedData = ref<{ resolved: Resolved[]; notFound: NotFound[]; totals: Totals } | null>(null)

const persistedLists = ref<PersistedList[]>([])
const loadingLists = ref(true)

const saveModalOpen = ref(false)
const saveForm = ref({ idCustomer: 0, name: '', isDefault: 0 as 0 | 1 })
const saveError = ref('')
const saving = ref(false)

function formatNum(n: any) { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(Number(n || 0)) }
function formatEur(n: any) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n || 0)) }
function formatDate(s: string | null | undefined) {
  if (!s) return '—'
  try { return new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) } catch { return s }
}
function sourceBadge(src: string): string {
  if (src === 'contract') return 'bg-primary-100 text-primary-700'
  if (src === 'tier') return 'bg-success-100 text-success-600'
  return 'bg-gray-100 text-gray-500'
}
function statusBadge(s: string): string {
  if (s === 'ok') return 'bg-success-100 text-success-600'
  if (s === 'partial') return 'bg-amber-100 text-amber-700'
  return 'bg-danger-100 text-danger-600'
}
function statusLabel(s: string): string {
  if (s === 'ok') return 'dispo'
  if (s === 'partial') return 'partiel'
  return 'rupture'
}

async function parseAndFill() {
  parsing.value = true
  parseSkipped.value = []
  try {
    const res = await $fetch<{ ok: boolean; items: any[]; skipped: string[] }>('/api/bo/quick-order/parse', {
      method: 'POST',
      body: { text: pasteText.value },
    })
    matrixItems.value = res.items.map(i => ({ sku: i.sku, qty: i.qty }))
    parseSkipped.value = res.skipped || []
  } catch (e: any) {
    alert(`Erreur parse : ${e?.data?.statusMessage || e?.message}`)
  } finally {
    parsing.value = false
  }
}

function clearAll() {
  pasteText.value = ''
  matrixItems.value = []
  resolvedData.value = null
  parseSkipped.value = []
}

function addRow() {
  matrixItems.value.push({ sku: '', qty: 1 })
}

async function reorderFromOrder() {
  if (!reorderId.value) return
  reordering.value = true
  try {
    const res = await $fetch<any>(`/api/bo/quick-order/reorder/${reorderId.value}`)
    matrixItems.value = res.items.map((i: any) => ({ sku: i.sku, qty: i.qty }))
    if (res.order?.idCustomer) idCustomer.value = res.order.idCustomer
  } catch (e: any) {
    alert(`Erreur re-commande : ${e?.data?.statusMessage || e?.message}`)
  } finally {
    reordering.value = false
  }
}

async function resolveBulk() {
  const items = matrixItems.value.filter(i => i.sku.trim() && i.qty > 0)
  if (!items.length) return
  resolving.value = true
  try {
    const res = await $fetch<any>('/api/bo/quick-order/bulk', {
      method: 'POST',
      body: { items, idCustomer: idCustomer.value || undefined },
    })
    resolvedData.value = { resolved: res.resolved, notFound: res.notFound, totals: res.totals }
  } catch (e: any) {
    alert(`Erreur résolution : ${e?.data?.statusMessage || e?.message}`)
  } finally {
    resolving.value = false
  }
}

function openSaveModal() {
  saveForm.value = { idCustomer: idCustomer.value || 0, name: '', isDefault: 0 }
  saveError.value = ''
  saveModalOpen.value = true
}

async function submitSave() {
  if (!resolvedData.value) return
  saving.value = true
  saveError.value = ''
  try {
    const items = resolvedData.value.resolved.map((r, i) => ({
      idProduct: r.idProduct,
      idProductAttribute: r.idProductAttribute || 0,
      quantity: r.qty,
      position: i,
    }))
    await $fetch('/api/bo/quick-order/lists', {
      method: 'POST',
      body: { ...saveForm.value, items },
    })
    saveModalOpen.value = false
    await loadLists()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || e?.message || 'Erreur inconnue'
  } finally {
    saving.value = false
  }
}

async function loadLists() {
  loadingLists.value = true
  try {
    const res = await $fetch<{ ok: boolean; lists: PersistedList[] }>('/api/bo/quick-order')
    persistedLists.value = res.lists || []
  } catch (e) {
    console.error('quick-order lists failed', e)
    persistedLists.value = []
  } finally {
    loadingLists.value = false
  }
}

async function loadList(id: number) {
  try {
    const res = await $fetch<any>(`/api/bo/quick-order/lists/${id}`)
    matrixItems.value = res.lines.map((l: any) => ({ sku: l.reference || `#${l.idProduct}`, qty: Number(l.quantity) }))
    idCustomer.value = res.list.idCustomer
    resolvedData.value = null
  } catch (e: any) {
    alert(`Erreur charge : ${e?.data?.statusMessage || e?.message}`)
  }
}

async function deleteList(l: PersistedList) {
  if (!confirm(`Supprimer la liste "${l.name}" ?`)) return
  try {
    await $fetch(`/api/bo/quick-order/lists/${l.id}`, { method: 'DELETE' })
    await loadLists()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

onMounted(loadLists)
</script>
