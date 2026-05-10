<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  PRM — Fiche détail d'un fournisseur.
  Infos + produits rattachés (ps_product_supplier) + historique BC.
-->
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <NuxtLink to="/hub/procurement/suppliers" class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 inline-flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Fournisseurs
        </NuxtLink>
        <span class="text-gray-300 dark:text-slate-700">/</span>
        <h1 v-if="data?.supplier" class="text-lg font-bold">{{ data.supplier.name }}</h1>
        <span v-if="data?.supplier" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
          :class="data.supplier.active ? 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400' : 'bg-gray-100 text-gray-500'">
          <span class="w-1 h-1 rounded-full" :class="data.supplier.active ? 'bg-success-500' : 'bg-gray-400'" />
          {{ data.supplier.active ? 'Actif' : 'Inactif' }}
        </span>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div v-if="loading" class="text-xs text-gray-400">Chargement…</div>

      <template v-else-if="data?.supplier">
        <!-- Infos de contact -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</h2>
            <dl class="space-y-2 text-xs">
              <div class="flex justify-between"><dt class="text-gray-500">Téléphone</dt><dd class="font-mono">{{ data.supplier.phone || '—' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Mobile</dt><dd class="font-mono">{{ data.supplier.phoneMobile || '—' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Adresse</dt><dd class="text-right">{{ data.supplier.address1 || '—' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Ville</dt><dd>{{ [data.supplier.postcode, data.supplier.city].filter(Boolean).join(' ') || '—' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Pays</dt><dd>{{ data.supplier.countryName || '—' }}</dd></div>
            </dl>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Référencement</h2>
            <dl class="space-y-2 text-xs">
              <div class="flex justify-between"><dt class="text-gray-500">ID</dt><dd class="font-mono">#{{ data.supplier.id }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Créé le</dt><dd>{{ fmtDate(data.supplier.dateAdd) }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Mis à jour</dt><dd>{{ fmtDate(data.supplier.dateUpd) }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Produits</dt><dd class="font-bold">{{ data.products.length }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">BC historiques</dt><dd class="font-bold">{{ data.orders.length }}</dd></div>
            </dl>
          </div>
        </div>

        <div v-if="data.supplier.description" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h2>
          <p class="text-xs text-gray-700 dark:text-slate-300 whitespace-pre-line">{{ data.supplier.description }}</p>
        </div>

        <!-- Attached products -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold">Produits rattachés</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ data.products.length }} produit(s) · prix et référence fournisseur</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Produit</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Réf. fournisseur</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Prix achat HT</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Stock</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-if="!data.products.length"><td colspan="4" class="px-4 py-8 text-center text-gray-400">Aucun produit référencé chez ce fournisseur.</td></tr>
                <tr v-for="p in data.products" :key="p.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-2"><p class="font-semibold">{{ p.name }}</p><p class="text-[10px] text-gray-400 font-mono">{{ p.reference || `#${p.id}` }}</p></td>
                  <td class="px-4 py-2 font-mono text-[11px] text-gray-600 dark:text-slate-400">{{ p.supplierRef || '—' }}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(p.priceTE) }}</td>
                  <td class="px-4 py-2 text-right tabular-nums" :class="p.stock === 0 ? 'text-danger-600 font-bold' : ''">{{ p.stock }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Historique BC -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold">Historique bons de commande</h2>
            <p class="text-xs text-gray-500 mt-0.5">20 derniers BC</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">Référence</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">État</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Total TTC</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Créé le</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">Livraison</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-if="!data.orders.length"><td colspan="5" class="px-4 py-8 text-center text-gray-400">Aucun bon de commande.</td></tr>
                <tr v-for="o in data.orders" :key="o.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer" @click="navigateTo(`/hub/procurement/purchase-orders/${o.id}`)">
                  <td class="px-4 py-2 font-mono text-[11px]">{{ o.reference }}</td>
                  <td class="px-4 py-2"><span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">{{ o.stateName }}</span></td>
                  <td class="px-4 py-2 text-right font-bold tabular-nums">{{ fmtEur(o.totalTTC) }}</td>
                  <td class="px-4 py-2 text-right text-gray-500">{{ fmtDate(o.dateAdd) }}</td>
                  <td class="px-4 py-2 text-right text-gray-500">{{ o.deliveryDate ? fmtDate(o.deliveryDate) : '—' }}</td>
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

const route = useRoute()
const data = ref<any>(null)
const loading = ref(true)

const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

async function load() {
  loading.value = true
  try {
    data.value = await $fetch(`/api/bo/procurement/suppliers/${route.params.id}`)
  } catch { data.value = null }
  finally { loading.value = false }
}

onMounted(load)
</script>
