<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  PRM — Réassort IA.
  Tab 1 : Produits sous seuil stock (vue brute).
  Tab 2 : Suggestions IA — grouped by fournisseur, EOQ simplifié, bouton Créer BC en un clic.
-->
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold">Réassort IA</h1>
          <p class="text-xs text-gray-500 mt-0.5">Stock bas · vélocité 30j · génération BC en un clic</p>
        </div>
        <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          <button @click="activeTab = 'threshold'"
            class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            :class="activeTab === 'threshold' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
            Sous seuil stock
          </button>
          <button @click="activeTab = 'ai'"
            class="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            :class="activeTab === 'ai' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
            Suggestions IA
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">

      <!-- ═══ TAB: Seuil brut ═══════════════════════════════════════ -->
      <template v-if="activeTab === 'threshold'">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Produits sous seuil ({{ thresholdStock }})</p>
            <p class="text-2xl font-extrabold text-amber-600">{{ thresholdData?.total ?? 0 }}</p>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-500">Seuil stock</label>
            <input v-model.number="thresholdStock" type="number" min="0" max="100"
              class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-20 bg-white dark:bg-slate-900"
              @change="loadThreshold" />
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Produit</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Fournisseur</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Stock</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Vendu 30j</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Jours restants</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-if="loadingThreshold" v-for="i in 4" :key="`sk-${i}`"><td colspan="5" class="px-4 py-3"><div class="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td></tr>
                <tr v-else-if="!thresholdData?.products.length"><td colspan="5" class="px-4 py-10 text-center text-gray-400">Aucun produit sous le seuil.</td></tr>
                <tr v-for="p in thresholdData?.products" :key="p.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-2"><p class="font-semibold">{{ p.name }}</p><p class="text-[10px] text-gray-400 font-mono">{{ p.reference || '—' }}</p></td>
                  <td class="px-4 py-2">{{ p.supplierName || '—' }}</td>
                  <td class="px-4 py-2 text-right font-bold tabular-nums" :class="p.stock === 0 ? 'text-danger-600' : p.stock <= 2 ? 'text-amber-600' : ''">{{ p.stock }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ p.sold30 }}</td>
                  <td class="px-4 py-2 text-right tabular-nums" :class="p.daysRemaining !== null && p.daysRemaining < 7 ? 'text-danger-600 font-bold' : 'text-gray-600'">
                    {{ p.daysRemaining !== null ? `${p.daysRemaining} j` : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- ═══ TAB: AI Suggestions grouped by supplier ══════════ -->
      <template v-if="activeTab === 'ai'">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Alerte (j restants)</label>
              <input v-model.number="aiThreshold" type="number" min="1" max="60"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900"
                @change="loadAi" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Couverture cible (j)</label>
              <input v-model.number="aiCover" type="number" min="7" max="180"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900"
                @change="loadAi" />
            </div>
            <div class="md:col-span-2 grid grid-cols-2 gap-3">
              <div class="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
                <p class="text-[10px] text-gray-500 uppercase tracking-wider">Produits à réassortir</p>
                <p class="text-xl font-extrabold">{{ aiData?.totalProducts ?? 0 }}</p>
              </div>
              <div class="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3">
                <p class="text-[10px] text-gray-500 uppercase tracking-wider">Investissement estimé</p>
                <p class="text-xl font-extrabold text-primary-600">{{ fmtEur(aiData?.totalValue ?? 0) }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="loadingAi" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-10 text-center text-xs text-gray-400 shadow-sm">
          Calcul des suggestions…
        </div>
        <div v-else-if="!aiData?.suppliers.length" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-10 text-center text-xs text-gray-400 shadow-sm">
          Aucun produit nécessite un réassort. Tout est sous contrôle.
        </div>
        <div v-else class="space-y-4">
          <div v-for="g in aiData.suppliers" :key="g.idSupplier || 'none'"
            class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold">{{ g.supplierName }}</h3>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ g.items.length }} produit(s) · {{ g.totalQty }} unités · {{ fmtEur(g.totalTE) }} HT
                </p>
              </div>
              <button v-if="g.idSupplier" @click="createPO(g)" :disabled="creatingGroup === g.idSupplier"
                class="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                {{ creatingGroup === g.idSupplier ? '…' : 'Créer BC' }}
              </button>
              <span v-else class="text-[10px] text-danger-500 font-semibold">Produits sans fournisseur</span>
            </div>
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold text-gray-500">Produit</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-500">Stock</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-500">Vélocité/j</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-500">Jours restants</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-500">Qté suggérée</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-500">PU HT</th>
                  <th class="px-4 py-2 text-right font-semibold text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-for="p in g.items" :key="p.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-2"><p class="font-semibold">{{ p.name }}</p><p class="text-[10px] text-gray-400 font-mono">{{ p.reference || `#${p.id}` }}<span v-if="p.supplierRef"> · {{ p.supplierRef }}</span></p></td>
                  <td class="px-4 py-2 text-right tabular-nums" :class="p.stock === 0 ? 'text-danger-600 font-bold' : ''">{{ p.stock }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ p.velocity }}</td>
                  <td class="px-4 py-2 text-right tabular-nums" :class="p.daysLeft < 7 ? 'text-danger-600 font-bold' : p.daysLeft < 15 ? 'text-amber-600' : ''">{{ p.daysLeft }} j</td>
                  <td class="px-4 py-2 text-right font-bold tabular-nums text-primary-600">{{ p.suggestedQty }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(p.unitPriceTE) }}</td>
                  <td class="px-4 py-2 text-right font-bold tabular-nums">{{ fmtEur(p.lineTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Success toast -->
        <div v-if="successMsg" class="fixed bottom-6 right-6 bg-success-600 text-white rounded-lg shadow-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 z-50">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          {{ successMsg }}
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const activeTab = ref<'threshold' | 'ai'>('threshold')

// ── Tab 1 : seuil brut ──
const thresholdStock = ref(5)
const thresholdData = ref<any>(null)
const loadingThreshold = ref(true)

async function loadThreshold() {
  loadingThreshold.value = true
  try {
    thresholdData.value = await $fetch('/api/bo/procurement/restock', { query: { threshold: thresholdStock.value } })
  } catch { thresholdData.value = null }
  finally { loadingThreshold.value = false }
}

// ── Tab 2 : IA ──
const aiThreshold = ref(15)
const aiCover = ref(60)
const aiData = ref<any>(null)
const loadingAi = ref(false)
const creatingGroup = ref<number | null>(null)
const successMsg = ref('')

async function loadAi() {
  loadingAi.value = true
  try {
    aiData.value = await $fetch('/api/bo/procurement/restock/suggestions', {
      query: { threshold: aiThreshold.value, targetCover: aiCover.value },
    })
  } catch { aiData.value = null }
  finally { loadingAi.value = false }
}

async function createPO(group: any) {
  if (!group.idSupplier) return
  if (!confirm(`Créer un BC pour « ${group.supplierName} » (${group.items.length} produits, ${group.totalQty} unités, ${group.totalTE.toLocaleString('fr-FR')} € HT) ?`)) return
  creatingGroup.value = group.idSupplier
  try {
    const res = await $fetch<any>('/api/bo/procurement/restock/create-po', {
      method: 'POST',
      body: {
        idSupplier: group.idSupplier,
        items: group.items.map((p: any) => ({
          idProduct: p.id, quantity: p.suggestedQty, unitPriceTE: p.unitPriceTE,
        })),
      },
    })
    successMsg.value = `BC ${res.reference} créé (${res.lineCount} lignes, ${res.totalTI?.toFixed(2)} € TTC)`
    setTimeout(() => { successMsg.value = '' }, 4000)
    await loadAi()
  } catch (e: any) {
    alert(e?.statusMessage || 'Erreur création BC')
  } finally { creatingGroup.value = null }
}

const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

watch(activeTab, (t) => {
  if (t === 'ai' && !aiData.value) loadAi()
})

onMounted(loadThreshold)
</script>
