<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <h1 class="text-lg font-bold">Avis Clients & UGC</h1>
      <p class="text-xs text-gray-500 mt-0.5">Avis produits (ps_product_comment) — modération + score moyen</p>
    </header>
    <div class="p-6 max-w-5xl mx-auto space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total</p><p class="text-2xl font-extrabold">{{ data?.stats.total ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Publiés</p><p class="text-2xl font-extrabold text-success-600">{{ data?.stats.approved ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">À modérer</p><p class="text-2xl font-extrabold text-amber-600">{{ data?.stats.pending ?? 0 }}</p></div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm"><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Note moyenne</p><p class="text-2xl font-extrabold">{{ data?.stats.avgGrade ?? 0 }} / 5</p></div>
      </div>

      <div class="space-y-3">
        <div v-if="!loading && !data?.reviews.length" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm px-6 py-10 text-center text-sm text-gray-400">
          Aucun avis produit.
        </div>
        <div v-for="r in data?.reviews" :key="r.id" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <div class="flex items-start justify-between gap-4 mb-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <p class="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{{ r.title || 'Sans titre' }}</p>
                <span v-if="!r.validated" class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">À modérer</span>
              </div>
              <p class="text-xs text-gray-500">Par <span class="font-semibold text-gray-700 dark:text-slate-300">{{ r.customerName }}</span> · {{ fmtDate(r.dateAdd) }}</p>
              <NuxtLink :to="`/hub/products?id=${r.productId}`" class="text-xs text-primary-600 hover:underline">{{ r.productName }}</NuxtLink>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              <svg v-for="i in 5" :key="i" class="w-4 h-4" :class="i <= r.grade ? 'text-amber-400' : 'text-gray-200 dark:text-slate-700'" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 0 0 .95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 0 0-.363 1.118l1.287 3.956c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 0 0-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.956a1 1 0 0 0-.363-1.118L2.98 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 0 0 .95-.69l1.286-3.957Z"/>
              </svg>
            </div>
          </div>
          <p class="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{{ r.content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })
const data = ref<any>(null); const loading = ref(true)
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : ''
async function load() { loading.value = true; try { data.value = await $fetch('/api/bo/support/reviews') } catch { data.value = null } finally { loading.value = false } }
onMounted(load)
</script>
