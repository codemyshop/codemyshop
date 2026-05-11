<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">DLC &amp; Décotes Auto</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ lots.length }} lot{{ lots.length > 1 ? 's' : '' }} en fenêtre de décote · {{ rules.length }} règle{{ rules.length > 1 ? 's' : '' }} active{{ rules.length > 1 ? 's' : '' }}</p>
      </div>
      <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Actualiser</button>
    </header>

    <div class="flex-1 overflow-auto p-6 space-y-6">

      
      <section>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500">Règles de décote</h2>
          <button @click="openRuleCreate" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">+ Nouvelle règle</button>
        </div>
        <div v-if="loading" class="h-20 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div
            v-for="r in rules"
            :key="r.id"
            class="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-4 group relative"
          >
            <div class="flex items-start justify-between mb-2">
              <p class="text-xs font-semibold text-gray-700 dark:text-slate-300">{{ r.label }}</p>
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="discountColorClass(r.discountPct)">
                -{{ formatPct(r.discountPct) }}%
              </span>
            </div>
            <p class="text-[10px] text-gray-400">
              {{ r.minDays === r.maxDays ? `J-${r.minDays}` : `J-${r.maxDays} → J-${r.minDays}` }}
            </p>
            <div class="absolute top-2 right-2 hidden group-hover:flex gap-1">
              <button @click="openRuleEdit(r)" class="text-[10px] px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:text-primary-600" title="Éditer">✎</button>
              <button @click="deleteRule(r)" class="text-[10px] px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-gray-600 hover:text-danger-500" title="Supprimer">✕</button>
            </div>
          </div>
        </div>
      </section>

      
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Lots en fenêtre de décote</h2>

        <div v-if="loading" class="space-y-2">
          <div v-for="i in 4" :key="i" class="h-12 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>

        <div v-else-if="!lots.length" class="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
          <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4">⏳</div>
          <p class="text-sm font-semibold text-gray-700 dark:text-slate-300">Aucun lot en fenêtre de décote</p>
          <p class="text-xs text-gray-400 mt-2 max-w-md">Les lots ayant une DLC entre 0 et 14 jours apparaissent ici automatiquement avec le % de remise applicable.</p>
        </div>

        <table v-else class="w-full text-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium">Lot</th>
              <th class="px-4 py-2.5 font-medium">Produit</th>
              <th class="px-4 py-2.5 font-medium">DLC</th>
              <th class="px-4 py-2.5 font-medium text-right">Restant</th>
              <th class="px-4 py-2.5 font-medium text-right">Prix</th>
              <th class="px-4 py-2.5 font-medium text-center">Décote</th>
              <th class="px-4 py-2.5 font-medium text-right">Prix décoté</th>
              <th class="px-4 py-2.5 font-medium text-center">État</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in lots" :key="l.id" class="border-t border-gray-50 dark:border-slate-800/50 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors">
              <td class="px-4 py-2.5 font-mono text-xs font-semibold text-primary-600">{{ l.lotNumber }}</td>
              <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">{{ l.productName || `#${l.idProduct}` }}</td>
              <td class="px-4 py-2.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-600 dark:text-slate-300">{{ formatDate(l.expiryDate) }}</span>
                  <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="daysBadgeClass(l.daysToExpiry)">
                    J+{{ l.daysToExpiry }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-2.5 text-right font-semibold text-gray-700 dark:text-slate-300">{{ formatNum(l.qtyRemaining) }}</td>
              <td class="px-4 py-2.5 text-right text-xs text-gray-500">{{ formatEur(l.basePrice) }}</td>
              <td class="px-4 py-2.5 text-center">
                <span v-if="l.discountPct" class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="discountColorClass(l.discountPct)">
                  -{{ formatPct(l.discountPct) }}%
                </span>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
              <td class="px-4 py-2.5 text-right font-bold" :class="l.discountPct ? 'text-success-600' : 'text-gray-400'">
                {{ formatEur(discountedPrice(l)) }}
              </td>
              <td class="px-4 py-2.5 text-center">
                <span v-if="l.idApplied" class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success-100 text-success-700" title="ps_specific_price actif — décote appliquée au checkout PS">
                  ● Appliqué
                </span>
                <span v-else-if="l.discountPct" class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500" title="Règle détectée mais pas encore synchronisée — lancer le cron ac_cron_expiry_discounts --apply">
                  ○ En attente
                </span>
                <span v-else class="text-[10px] text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div class="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-700/30 rounded-lg text-xs text-success-700 dark:text-success-300">
        ✅ <strong>Phase 3</strong> — CRUD règles ci-dessus + sync <code>ps_specific_price</code> via cron <code>ac_cron_expiry_discounts</code> planifié 03:30 UTC (idempotent). Les lots marqués ● Appliqué ont une décote active côté checkout PS natif ; les ○ En attente seront traités au prochain passage du cron.
      </div>
    </div>

    
    <div v-if="ruleModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="ruleModalOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md mx-4">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">
            {{ ruleEditId ? 'Éditer la règle' : 'Nouvelle règle' }}
          </h2>
          <button @click="ruleModalOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitRule" class="p-5 space-y-3">
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Libellé *</span>
            <input v-model="ruleForm.label" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="DLC 7-14 jours" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Jours min *</span>
              <input v-model.number="ruleForm.minDays" type="number" min="0" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Jours max *</span>
              <input v-model.number="ruleForm.maxDays" type="number" min="0" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">% remise *</span>
              <input v-model.number="ruleForm.discountPct" type="number" step="0.01" min="0" max="100" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs flex items-center gap-2 mt-4">
              <input v-model="ruleForm.active" type="checkbox" :true-value="1" :false-value="0" />
              <span class="text-gray-500 dark:text-slate-400">Règle active</span>
            </label>
          </div>
          <p v-if="ruleError" class="text-xs text-danger-500">{{ ruleError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="ruleModalOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" :disabled="ruleSaving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">{{ ruleSaving ? 'Sauvegarde…' : (ruleEditId ? 'Enregistrer' : 'Créer') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface Rule {
  id: number
  label: string
  minDays: number
  maxDays: number
  discountPct: number
  active: number
  position: number
}

interface LotExpiry {
  id: number
  lotNumber: string
  idProduct: number
  productName: string | null
  expiryDate: string
  daysToExpiry: number
  qtyRemaining: number
  origin: string | null
  basePrice: number
  discountPct: number | null
  idApplied: number | null
  appliedPct: number | null
}

const rules = ref<Rule[]>([])
const lots = ref<LotExpiry[]>([])
const loading = ref(true)

const ruleModalOpen = ref(false)
const ruleEditId = ref<number | null>(null)
const ruleSaving = ref(false)
const ruleError = ref('')
const ruleForm = ref({
  label: '',
  minDays: 0,
  maxDays: 0,
  discountPct: 0,
  active: 1 as 0 | 1,
})

function formatNum(n: number | string | undefined | null) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(n || 0))
}
function formatPct(n: number | string | undefined | null) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n || 0))
}
function formatEur(n: number | string | undefined | null) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n || 0))
}
function formatDate(s: string | null | undefined) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('fr-FR') } catch { return s }
}

function discountColorClass(pct: number | string | null | undefined): string {
  const p = Number(pct || 0)
  if (p >= 70) return 'bg-danger-100 text-danger-700'
  if (p >= 50) return 'bg-danger-50 text-danger-600'
  if (p >= 30) return 'bg-amber-100 text-amber-700'
  if (p > 0)   return 'bg-amber-50 text-amber-600'
  return 'bg-gray-100 text-gray-500'
}

function daysBadgeClass(d: number): string {
  if (d <= 0) return 'bg-danger-100 text-danger-700'
  if (d <= 2) return 'bg-danger-50 text-danger-600'
  if (d <= 6) return 'bg-amber-100 text-amber-600'
  return 'bg-success-100 text-success-600'
}

function discountedPrice(l: LotExpiry): number {
  const base = Number(l.basePrice || 0)
  const pct = Number(l.discountPct || 0)
  if (!pct) return base
  return base * (1 - pct / 100)
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; rules: Rule[]; lots: LotExpiry[] }>('/api/bo/expiry')
    rules.value = res.rules || []
    lots.value = res.lots || []
  } catch (e) {
    console.error('expiry load failed', e)
    rules.value = []
    lots.value = []
  } finally {
    loading.value = false
  }
}

function openRuleCreate() {
  ruleEditId.value = null
  ruleError.value = ''
  ruleForm.value = { label: '', minDays: 0, maxDays: 0, discountPct: 0, active: 1 }
  ruleModalOpen.value = true
}

function openRuleEdit(r: Rule) {
  ruleEditId.value = r.id
  ruleError.value = ''
  ruleForm.value = {
    label: r.label,
    minDays: r.minDays,
    maxDays: r.maxDays,
    discountPct: Number(r.discountPct),
    active: r.active ? 1 : 0,
  }
  ruleModalOpen.value = true
}

async function submitRule() {
  ruleSaving.value = true
  ruleError.value = ''
  try {
    if (ruleEditId.value) {
      await $fetch(`/api/bo/expiry/rules/${ruleEditId.value}`, {
        method: 'PUT',
        body: ruleForm.value,
      })
    } else {
      await $fetch('/api/bo/expiry/rules', {
        method: 'POST',
        body: ruleForm.value,
      })
    }
    ruleModalOpen.value = false
    await load()
  } catch (e: any) {
    ruleError.value = e?.data?.statusMessage || e?.message || 'Erreur inconnue'
  } finally {
    ruleSaving.value = false
  }
}

async function deleteRule(r: Rule) {
  if (!confirm(`Supprimer la règle "${r.label}" ?`)) return
  try {
    await $fetch(`/api/bo/expiry/rules/${r.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

onMounted(load)
</script>
