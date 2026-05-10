<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Grilles Tarifaires B2B</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ groups.length }} groupe{{ groups.length > 1 ? 's' : '' }} · {{ tiers.length }} palier{{ tiers.length > 1 ? 's' : '' }} · {{ contracts.length }} contrat{{ contracts.length > 1 ? 's' : '' }}</p>
      </div>
      <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Actualiser</button>
    </header>

    <div class="flex-1 overflow-auto p-6 space-y-6">

      <!-- ─── Resolution simulator ──────────────────────────────── -->
      <section class="bg-primary-50/40 dark:bg-slate-800/30 border border-primary-100 dark:border-slate-700 rounded-xl p-4">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-300 mb-3">🧮 Simulateur de résolution</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label class="text-xs">
            <span class="text-gray-500 dark:text-slate-400">Produit (id)</span>
            <input v-model.number="sim.product" type="number" min="1" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <label class="text-xs">
            <span class="text-gray-500 dark:text-slate-400">Client (id)</span>
            <input v-model.number="sim.customer" type="number" min="1" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <label class="text-xs">
            <span class="text-gray-500 dark:text-slate-400">Quantité</span>
            <input v-model.number="sim.qty" type="number" min="1" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <button @click="resolve" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold">Résoudre</button>
        </div>
        <div v-if="simResult" class="mt-3 flex items-center gap-3">
          <span class="text-sm font-mono font-bold text-primary-700 dark:text-primary-300">{{ formatEur(simResult.price) }}</span>
          <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="sourceBadgeClass(simResult.source)">{{ simResult.source }}</span>
          <span class="text-xs text-gray-500 dark:text-slate-400">{{ simResult.rule?.label }}</span>
        </div>
      </section>

      <!-- ─── Groupes tarifaires ──────────────────────────────── -->
      <section>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500">Groupes tarifaires</h2>
          <button @click="openGroupCreate" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">+ Nouveau groupe</button>
        </div>
        <div v-if="loading" class="h-20 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div v-else-if="!groups.length" class="py-10 text-center text-xs text-gray-400">Aucun groupe tarifaire. Créez-en un pour démarrer.</div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div
            v-for="g in groups"
            :key="g.id"
            class="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-4 group relative"
          >
            <div class="flex items-start justify-between mb-2">
              <p class="text-xs font-semibold text-gray-700 dark:text-slate-300">{{ g.name }}</p>
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="g.active ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-400'">
                {{ g.active ? 'actif' : 'inactif' }}
              </span>
            </div>
            <p class="text-[10px] text-gray-400">Priorité {{ g.priority }} · {{ tiersByGroup[g.id]?.length || 0 }} palier{{ (tiersByGroup[g.id]?.length || 0) > 1 ? 's' : '' }}</p>
            <div class="absolute top-2 right-2 hidden group-hover:flex gap-1">
              <button @click="openGroupEdit(g)" class="text-[10px] px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:text-primary-600" title="Éditer">✎</button>
              <button @click="deleteGroup(g)" class="text-[10px] px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:text-danger-500" title="Supprimer">✕</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ─── Paliers tarifaires ──────────────────────────────── -->
      <section>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500">Paliers quantité → prix</h2>
          <button @click="openTierCreate" :disabled="!groups.length" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed">+ Nouveau palier</button>
        </div>
        <div v-if="loading" class="space-y-2">
          <div v-for="i in 4" :key="i" class="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div v-else-if="!tiers.length" class="py-10 text-center text-xs text-gray-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">Aucun palier. Créez-en un pour activer la résolution B2B.</div>
        <table v-else class="w-full text-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium">Groupe</th>
              <th class="px-4 py-2.5 font-medium">Produit</th>
              <th class="px-4 py-2.5 font-medium text-right">Qté min</th>
              <th class="px-4 py-2.5 font-medium text-right">Prix HT</th>
              <th class="px-4 py-2.5 font-medium text-center">Actif</th>
              <th class="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tiers" :key="t.id" class="border-t border-gray-50 dark:border-slate-800/50 hover:bg-primary-50/20 dark:hover:bg-primary-900/10 transition-colors">
              <td class="px-4 py-2.5 font-semibold text-gray-800 dark:text-slate-100">{{ t.groupName || `#${t.idGroup}` }}</td>
              <td class="px-4 py-2.5">
                <div class="flex flex-col">
                  <span class="text-xs text-gray-800 dark:text-slate-100">{{ t.productName || `#${t.idProduct}` }}</span>
                  <span class="text-[10px] font-mono text-gray-400">{{ t.productRef || '—' }}</span>
                </div>
              </td>
              <td class="px-4 py-2.5 text-right font-mono text-xs">{{ formatNum(t.minQuantity) }}</td>
              <td class="px-4 py-2.5 text-right font-mono text-xs font-semibold">{{ formatEur(t.unitPriceHt) }}</td>
              <td class="px-4 py-2.5 text-center">
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="t.active ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-400'">
                  {{ t.active ? '✓' : '—' }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-right">
                <div class="flex justify-end gap-1">
                  <button @click="openTierEdit(t)" class="text-[10px] px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:text-primary-600" title="Éditer">✎</button>
                  <button @click="deleteTier(t)" class="text-[10px] px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:text-danger-500" title="Supprimer">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ─── Negotiated contracts (read-only in MVP) ──────────────────────────────── -->
      <section v-if="contracts.length">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Contrats négociés individuels</h2>
        <table class="w-full text-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium">Client</th>
              <th class="px-4 py-2.5 font-medium">Produit</th>
              <th class="px-4 py-2.5 font-medium text-right">Prix HT</th>
              <th class="px-4 py-2.5 font-medium">Validité</th>
              <th class="px-4 py-2.5 font-medium text-center">Actif</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in contracts" :key="c.id" class="border-t border-gray-50 dark:border-slate-800/50">
              <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">{{ c.customerName || `#${c.idCustomer}` }}</td>
              <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">{{ c.productName || `#${c.idProduct}` }}</td>
              <td class="px-4 py-2.5 text-right font-mono text-xs font-semibold">{{ formatEur(c.unitPriceHt) }}</td>
              <td class="px-4 py-2.5 text-xs text-gray-500">{{ c.validFrom || '—' }} → {{ c.validTo || '∞' }}</td>
              <td class="px-4 py-2.5 text-center">
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="c.active ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-400'">
                  {{ c.active ? '✓' : '—' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- ─── Modal groupe ──────────────────────────────── -->
    <div v-if="groupModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="groupModalOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md mx-4">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ groupEditId ? 'Éditer le groupe' : 'Nouveau groupe' }}</h2>
          <button @click="groupModalOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitGroup" class="p-5 space-y-3">
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Nom *</span>
            <input v-model="groupForm.name" required maxlength="64" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="Restau, Traiteur, Gold…" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Priorité</span>
              <input v-model.number="groupForm.priority" type="number" min="0" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs flex items-center gap-2 mt-4">
              <input v-model="groupForm.active" type="checkbox" :true-value="1" :false-value="0" />
              <span class="text-gray-500 dark:text-slate-400">Actif</span>
            </label>
          </div>
          <p v-if="groupError" class="text-xs text-danger-500">{{ groupError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="groupModalOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" :disabled="groupSaving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">{{ groupSaving ? 'Sauvegarde…' : (groupEditId ? 'Enregistrer' : 'Créer') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ─── Modal palier ──────────────────────────────── -->
    <div v-if="tierModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="tierModalOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md mx-4">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ tierEditId ? 'Éditer le palier' : 'Nouveau palier' }}</h2>
          <button @click="tierModalOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitTier" class="p-5 space-y-3">
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Groupe *</span>
            <select v-model.number="tierForm.idGroup" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5">
              <option value="" disabled>— Sélectionner —</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </label>
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">ID Produit *</span>
            <input v-model.number="tierForm.idProduct" type="number" min="1" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Qté min *</span>
              <input v-model.number="tierForm.minQuantity" type="number" step="0.001" min="0.001" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Prix HT *</span>
              <input v-model.number="tierForm.unitPriceHt" type="number" step="0.000001" min="0" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Devise</span>
              <input v-model="tierForm.currency" maxlength="3" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs flex items-center gap-2 mt-4">
              <input v-model="tierForm.active" type="checkbox" :true-value="1" :false-value="0" />
              <span class="text-gray-500 dark:text-slate-400">Actif</span>
            </label>
          </div>
          <p v-if="tierError" class="text-xs text-danger-500">{{ tierError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="tierModalOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" :disabled="tierSaving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">{{ tierSaving ? 'Sauvegarde…' : (tierEditId ? 'Enregistrer' : 'Créer') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface Group {
  id: number
  name: string
  priority: number
  active: number
}
interface Tier {
  id: number
  idGroup: number
  groupName: string | null
  idProduct: number
  productName: string | null
  productRef: string | null
  idProductAttribute: number
  minQuantity: number
  unitPriceHt: number
  currency: string
  active: number
}
interface Contract {
  id: number
  idCustomer: number
  customerName: string | null
  idProduct: number
  productName: string | null
  unitPriceHt: number
  currency: string
  validFrom: string | null
  validTo: string | null
  notes: string | null
  active: number
}

const groups = ref<Group[]>([])
const tiers = ref<Tier[]>([])
const contracts = ref<Contract[]>([])
const loading = ref(true)

const tiersByGroup = computed(() => {
  const acc: Record<number, Tier[]> = {}
  for (const t of tiers.value) {
    (acc[t.idGroup] ||= []).push(t)
  }
  return acc
})

const sim = ref({ product: 1, customer: 1, qty: 10 })
const simResult = ref<{ price: number; source: string; rule: { id: number | null; label: string } } | null>(null)

const groupModalOpen = ref(false)
const groupEditId = ref<number | null>(null)
const groupSaving = ref(false)
const groupError = ref('')
const groupForm = ref({ name: '', priority: 0, active: 1 as 0 | 1 })

const tierModalOpen = ref(false)
const tierEditId = ref<number | null>(null)
const tierSaving = ref(false)
const tierError = ref('')
const tierForm = ref({ idGroup: 0, idProduct: 0, minQuantity: 1, unitPriceHt: 0, currency: 'EUR', active: 1 as 0 | 1 })

function formatNum(n: number | string | undefined | null) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(Number(n || 0))
}
function formatEur(n: number | string | undefined | null) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(n || 0))
}
function sourceBadgeClass(s: string): string {
  if (s === 'contract') return 'bg-primary-100 text-primary-700'
  if (s === 'tier') return 'bg-success-100 text-success-600'
  return 'bg-gray-100 text-gray-500'
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; groups: Group[]; tiers: Tier[]; contracts: Contract[] }>('/api/bo/pricing')
    groups.value = res.groups || []
    tiers.value = res.tiers || []
    contracts.value = res.contracts || []
  } catch (e) {
    console.error('pricing load failed', e)
    groups.value = []
    tiers.value = []
    contracts.value = []
  } finally {
    loading.value = false
  }
}

async function resolve() {
  try {
    const res = await $fetch<any>('/api/bo/pricing/resolve', {
      query: { product: sim.value.product, customer: sim.value.customer, qty: sim.value.qty },
    })
    simResult.value = res
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

function openGroupCreate() {
  groupEditId.value = null
  groupError.value = ''
  groupForm.value = { name: '', priority: 0, active: 1 }
  groupModalOpen.value = true
}
function openGroupEdit(g: Group) {
  groupEditId.value = g.id
  groupError.value = ''
  groupForm.value = { name: g.name, priority: Number(g.priority), active: g.active ? 1 : 0 }
  groupModalOpen.value = true
}
async function submitGroup() {
  groupSaving.value = true
  groupError.value = ''
  try {
    if (groupEditId.value) {
      await $fetch(`/api/bo/pricing/groups/${groupEditId.value}`, { method: 'PUT', body: groupForm.value })
    } else {
      await $fetch('/api/bo/pricing/groups', { method: 'POST', body: groupForm.value })
    }
    groupModalOpen.value = false
    await load()
  } catch (e: any) {
    groupError.value = e?.data?.statusMessage || e?.message || 'Erreur inconnue'
  } finally {
    groupSaving.value = false
  }
}
async function deleteGroup(g: Group) {
  if (!confirm(`Supprimer le groupe "${g.name}" et tous ses paliers ?`)) return
  try {
    await $fetch(`/api/bo/pricing/groups/${g.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

function openTierCreate() {
  tierEditId.value = null
  tierError.value = ''
  tierForm.value = { idGroup: groups.value[0]?.id || 0, idProduct: 0, minQuantity: 1, unitPriceHt: 0, currency: 'EUR', active: 1 }
  tierModalOpen.value = true
}
function openTierEdit(t: Tier) {
  tierEditId.value = t.id
  tierError.value = ''
  tierForm.value = {
    idGroup: t.idGroup,
    idProduct: t.idProduct,
    minQuantity: Number(t.minQuantity),
    unitPriceHt: Number(t.unitPriceHt),
    currency: t.currency,
    active: t.active ? 1 : 0,
  }
  tierModalOpen.value = true
}
async function submitTier() {
  tierSaving.value = true
  tierError.value = ''
  try {
    if (tierEditId.value) {
      const { idGroup, idProduct, ...payload } = tierForm.value
      await $fetch(`/api/bo/pricing/tiers/${tierEditId.value}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/bo/pricing/tiers', { method: 'POST', body: tierForm.value })
    }
    tierModalOpen.value = false
    await load()
  } catch (e: any) {
    tierError.value = e?.data?.statusMessage || e?.message || 'Erreur inconnue'
  } finally {
    tierSaving.value = false
  }
}
async function deleteTier(t: Tier) {
  if (!confirm(`Supprimer le palier "${t.groupName} / ${t.productName || t.idProduct} ≥ ${t.minQuantity}" ?`)) return
  try {
    await $fetch(`/api/bo/pricing/tiers/${t.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

onMounted(load)
</script>
