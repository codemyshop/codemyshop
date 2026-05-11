<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Traçabilité &amp; Lots</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ stats.total || 0 }} lot{{ (stats.total || 0) > 1 ? 's' : '' }} actif{{ (stats.total || 0) > 1 ? 's' : '' }} · {{ formatNum(stats.totalQtyRemaining) }} unités en stock</p>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="search" type="text" placeholder="Lot, produit, fournisseur…" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-56" @keyup.enter="load" />
        <div class="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button @click="setWindow('all')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="expiryWindow === 'all' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">Tous</button>
          <button @click="setWindow('30')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="expiryWindow === '30' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'">DLC 30j</button>
          <button @click="setWindow('7')"  class="px-3 py-1.5 text-xs font-medium transition-colors" :class="expiryWindow === '7'  ? 'bg-danger-500 text-white' : 'text-gray-600 hover:bg-gray-50'">DLC 7j</button>
        </div>
        <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Actualiser</button>
        <button @click="openCreate" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">+ Nouveau lot</button>
      </div>
    </header>

    
    <div class="grid grid-cols-4 gap-3 px-6 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 shrink-0">
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-3">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider">Lots actifs</p>
        <p class="text-xl font-bold text-gray-800 dark:text-slate-100">{{ stats.total || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-700/30 p-3">
        <p class="text-[10px] text-amber-600 uppercase tracking-wider">DLC &lt; 7 jours</p>
        <p class="text-xl font-bold text-amber-600">{{ stats.expiringSoon || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-danger-200 dark:border-danger-700/30 p-3">
        <p class="text-[10px] text-danger-500 uppercase tracking-wider">Expirés</p>
        <p class="text-xl font-bold text-danger-500">{{ stats.expired || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-3">
        <p class="text-[10px] text-gray-400 uppercase tracking-wider">Épuisés</p>
        <p class="text-xl font-bold text-gray-500">{{ stats.depleted || 0 }}</p>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="px-6 py-4 space-y-2">
        <div v-for="i in 8" :key="i" class="h-12 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
      </div>

      <div v-else-if="!lots.length" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4">🧬</div>
        <p class="text-sm font-semibold text-gray-700 dark:text-slate-300">Aucun lot</p>
        <p class="text-xs text-gray-400 mt-2 max-w-md">Les lots de traçabilité s'enregistrent à la réception fournisseur. Le module ac_lot crée la table cs_lot et propose des seeds de démo.</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium">Lot</th>
            <th class="px-4 py-2.5 font-medium">Produit</th>
            <th class="px-4 py-2.5 font-medium">Fournisseur</th>
            <th class="px-4 py-2.5 font-medium">Origine</th>
            <th class="px-4 py-2.5 font-medium">Réception</th>
            <th class="px-4 py-2.5 font-medium">DLC</th>
            <th class="px-4 py-2.5 font-medium text-right">Reçu</th>
            <th class="px-4 py-2.5 font-medium text-right">Restant</th>
            <th class="px-4 py-2.5 font-medium text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in lots" :key="l.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors">
            <td class="px-4 py-2.5">
              <div class="font-mono text-xs font-semibold text-primary-600">{{ l.lotNumber }}</div>
              <div v-if="l.caliber" class="text-[10px] text-gray-400 mt-0.5">Calibre : {{ l.caliber }}</div>
            </td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">{{ l.productName || `#${l.idProduct}` }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ l.supplierName || '—' }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ l.origin || '—' }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(l.entryDate) }}</td>
            <td class="px-4 py-2.5">
              <div v-if="l.expiryDate" class="flex items-center gap-2">
                <span class="text-xs text-gray-600 dark:text-slate-300">{{ formatDate(l.expiryDate) }}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="expiryBadgeClass(l.daysToExpiry)">
                  {{ expiryBadgeLabel(l.daysToExpiry) }}
                </span>
              </div>
              <span v-else class="text-xs italic text-gray-400">—</span>
            </td>
            <td class="px-4 py-2.5 text-right font-semibold text-gray-700 dark:text-slate-300">{{ formatNum(l.qtyReceived) }}</td>
            <td class="px-4 py-2.5 text-right">
              <span :class="qtyRemainingClass(l)">{{ formatNum(l.qtyRemaining) }}</span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <button @click="openRecall(l)" class="text-xs font-semibold text-danger-500 hover:text-danger-600" title="Rappel sanitaire : liste des clients à prévenir">
                Rappel
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && lots.length" class="mt-4 mx-6 mb-6 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-700/30 rounded-lg text-xs text-success-700 dark:text-success-300">
        ✅ <strong>Phase 3</strong> — FIFO strict actif. Hook <code>actionValidateOrder</code> consomme les lots les plus anciens et loggue le lien exact dans <code>cs_lot_order_detail</code>. Le rappel utilise ce lien quand disponible, fallback approximation sinon.
      </div>
    </div>

    
    <div v-if="createOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="createOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Nouveau lot — réception fournisseur</h2>
          <button @click="createOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitCreate" class="p-5 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Numéro de lot *</span>
              <input v-model="form.lotNumber" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="RUN-20260416-A1" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">id_product *</span>
              <input v-model.number="form.idProduct" type="number" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">id_supplier</span>
              <input v-model.number="form.idSupplier" type="number" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="0" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Qté reçue *</span>
              <input v-model.number="form.qtyReceived" type="number" step="0.001" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Réception *</span>
              <input v-model="form.entryDate" type="date" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">DLC</span>
              <input v-model="form.expiryDate" type="date" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Origine</span>
              <input v-model="form.origin" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="France" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Calibre</span>
              <input v-model="form.caliber" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="58/62" />
            </label>
          </div>
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Notes</span>
            <textarea v-model="form.notes" rows="2" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5"></textarea>
          </label>
          <p v-if="createError" class="text-xs text-danger-500">{{ createError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="createOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" :disabled="creating" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">{{ creating ? 'Création…' : 'Créer le lot' }}</button>
          </div>
        </form>
      </div>
    </div>

    
    <div v-if="recallOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="recallOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Rappel sanitaire — lot {{ recallLot?.lotNumber }}</h2>
            <p class="text-[10px] mt-0.5">
              <span class="text-gray-400">{{ recallCustomers.length }} client{{ recallCustomers.length > 1 ? 's' : '' }} à prévenir</span>
              <span v-if="recallCustomers.length" class="ml-2 font-semibold px-1.5 py-0.5 rounded-full"
                :class="recallMethod === 'fifo' ? 'bg-success-100 text-success-600' : 'bg-amber-100 text-amber-600'">
                {{ recallMethod === 'fifo' ? 'FIFO exact' : 'Approximation' }}
              </span>
            </p>
          </div>
          <button @click="recallOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div v-if="recallLoading" class="p-5 space-y-2">
          <div v-for="i in 4" :key="i" class="h-10 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div v-else-if="!recallCustomers.length" class="p-10 text-center">
          <p class="text-sm text-gray-500">Aucun client à prévenir.</p>
          <p class="text-xs text-gray-400 mt-2">Aucune commande validée sur ce produit depuis la réception du lot.</p>
        </div>
        <div v-else class="p-5">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-xs text-gray-500">Emails séparés par virgule :</span>
            <button @click="copyEmails" class="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700">{{ copied ? 'Copié ✓' : 'Copier les emails' }}</button>
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                <th class="px-2 py-2 font-medium">Client</th>
                <th class="px-2 py-2 font-medium">Email</th>
                <th class="px-2 py-2 font-medium">Commande</th>
                <th class="px-2 py-2 font-medium">Date</th>
                <th class="px-2 py-2 font-medium text-right">Qté</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in recallCustomers" :key="`${c.idOrder}-${c.idCustomer}`" class="border-b border-gray-50 dark:border-slate-800/50">
                <td class="px-2 py-2">
                  <div class="font-medium text-gray-800 dark:text-slate-100">{{ c.firstname }} {{ c.lastname }}</div>
                  <div v-if="c.company" class="text-[10px] text-gray-400">{{ c.company }}</div>
                </td>
                <td class="px-2 py-2 text-xs"><a :href="`mailto:${c.email}`" class="text-primary-600 hover:underline">{{ c.email }}</a></td>
                <td class="px-2 py-2 text-xs font-mono text-gray-600 dark:text-slate-300">{{ c.orderRef }}</td>
                <td class="px-2 py-2 text-xs text-gray-500">{{ formatDate(c.orderDate) }}</td>
                <td class="px-2 py-2 text-right text-xs font-semibold">{{ formatNum(c.qty) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface Lot {
  id: number
  lotNumber: string
  idProduct: number
  productName: string | null
  idSupplier: number
  supplierName: string | null
  entryDate: string
  expiryDate: string | null
  qtyReceived: number
  qtyRemaining: number
  origin: string | null
  caliber: string | null
  notes: string | null
  daysToExpiry: number | null
}

interface Stats {
  total?: number
  expired?: number
  expiringSoon?: number
  depleted?: number
  totalQtyRemaining?: number
}

const lots = ref<Lot[]>([])
const stats = ref<Stats>({})
const loading = ref(true)
const search = ref('')
const expiryWindow = ref<'all' | '7' | '30'>('all')

const createOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const form = ref({
  lotNumber: '',
  idProduct: null as number | null,
  idSupplier: 0,
  qtyReceived: null as number | null,
  entryDate: new Date().toISOString().slice(0, 10),
  expiryDate: '',
  origin: '',
  caliber: '',
  notes: '',
})

const recallOpen = ref(false)
const recallLoading = ref(false)
const recallLot = ref<Lot | null>(null)
const recallCustomers = ref<any[]>([])
const recallMethod = ref<'fifo' | 'approx'>('fifo')
const copied = ref(false)

function formatNum(n: number | string | undefined | null) {
  const v = Number(n || 0)
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v)
}

function formatDate(s: string | null | undefined) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('fr-FR') } catch { return s }
}

function expiryBadgeClass(days: number | null) {
  if (days === null || days === undefined) return 'bg-gray-100 text-gray-500'
  if (days < 0)  return 'bg-danger-100 text-danger-600'
  if (days <= 7) return 'bg-amber-100 text-amber-600'
  return 'bg-success-100 text-success-600'
}

function expiryBadgeLabel(days: number | null) {
  if (days === null || days === undefined) return '—'
  if (days < 0)  return `Expiré ${-days}j`
  if (days === 0) return 'Aujourd\'hui'
  return `J+${days}`
}

function qtyRemainingClass(l: Lot) {
  const rem = Number(l.qtyRemaining || 0)
  const rec = Number(l.qtyReceived || 0)
  if (rem <= 0) return 'text-gray-400 italic'
  if (rec > 0 && rem / rec < 0.2) return 'text-amber-600 font-semibold'
  return 'text-gray-700 dark:text-slate-300 font-semibold'
}

function setWindow(w: 'all' | '7' | '30') {
  expiryWindow.value = w
  load()
}

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (search.value) params.set('search', search.value)
    if (expiryWindow.value !== 'all') params.set('expiryWindow', expiryWindow.value)
    const res = await $fetch<{ ok: boolean; lots: Lot[]; stats: Stats }>(`/api/bo/lots?${params}`)
    lots.value = res.lots || []
    stats.value = res.stats || {}
  } catch (e) {
    console.error('lots load failed', e)
    lots.value = []
    stats.value = {}
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createError.value = ''
  form.value = {
    lotNumber: '',
    idProduct: null,
    idSupplier: 0,
    qtyReceived: null,
    entryDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    origin: '',
    caliber: '',
    notes: '',
  }
  createOpen.value = true
}

async function submitCreate() {
  creating.value = true
  createError.value = ''
  try {
    await $fetch('/api/bo/lots', {
      method: 'POST',
      body: {
        lotNumber:  form.value.lotNumber,
        idProduct:  form.value.idProduct,
        idSupplier: form.value.idSupplier || 0,
        qtyReceived: form.value.qtyReceived,
        entryDate:  form.value.entryDate,
        expiryDate: form.value.expiryDate || null,
        origin:     form.value.origin || null,
        caliber:    form.value.caliber || null,
        notes:      form.value.notes || null,
      },
    })
    createOpen.value = false
    await load()
  } catch (e: any) {
    createError.value = e?.data?.statusMessage || e?.message || 'Erreur inconnue'
  } finally {
    creating.value = false
  }
}

async function openRecall(l: Lot) {
  recallLot.value = l
  recallOpen.value = true
  recallLoading.value = true
  recallCustomers.value = []
  recallMethod.value = 'fifo'
  copied.value = false
  try {
    const res = await $fetch<{ ok: boolean; customers: any[]; method: 'fifo' | 'approx' }>(`/api/bo/lots/${l.id}/recall`)
    recallCustomers.value = res.customers || []
    recallMethod.value = res.method || 'fifo'
  } catch (e) {
    console.error('recall failed', e)
  } finally {
    recallLoading.value = false
  }
}

async function copyEmails() {
  const emails = recallCustomers.value.map(c => c.email).filter(Boolean).join(', ')
  try {
    await navigator.clipboard.writeText(emails)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}

onMounted(load)
</script>
