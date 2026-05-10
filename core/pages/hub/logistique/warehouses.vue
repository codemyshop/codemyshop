<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Entrepôts</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ warehouses.length }} entrepôt{{ warehouses.length > 1 ? 's' : '' }} · {{ totalProducts }} référence{{ totalProducts > 1 ? 's' : '' }} stockée{{ totalProducts > 1 ? 's' : '' }}</p>
      </div>
      <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Actualiser</button>
    </header>

    <div class="flex-1 overflow-auto p-6">
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!warehouses.length" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4">🏬</div>
        <p class="text-sm font-semibold text-gray-700 dark:text-slate-300">Aucun entrepôt configuré</p>
        <p class="text-xs text-gray-400 mt-2 max-w-md">Activez la gestion avancée des stocks dans PrestaShop puis créez vos entrepôts (Catalogue → Stocks → Entrepôts) pour commencer à tracer vos quantités par site physique.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="w in warehouses"
          :key="w.id"
          class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          <div class="p-5">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl shrink-0">🏬</div>
                <div>
                  <p class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ w.name }}</p>
                  <p v-if="w.reference" class="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{{ w.reference }}</p>
                </div>
              </div>
              <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500">{{ w.managementType }}</span>
            </div>

            <div v-if="w.address1" class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-4">
              <p>{{ w.address1 }}</p>
              <p v-if="w.address2">{{ w.address2 }}</p>
              <p>{{ w.postcode }} {{ w.city }}<span v-if="w.country"> · {{ w.country }}</span></p>
              <p v-if="w.phone || w.phoneMobile" class="mt-1 text-gray-400">📞 {{ w.phone || w.phoneMobile }}</p>
            </div>
            <div v-else class="text-xs italic text-gray-400 mb-4">Pas d'adresse renseignée</div>

            <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
              <div>
                <p class="text-[10px] text-gray-400 uppercase tracking-wider">Références</p>
                <p class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ w.nbProducts }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] text-gray-400 uppercase tracking-wider">Quantité totale</p>
                <p class="text-lg font-bold text-primary-600">{{ formatNum(w.totalQty) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface Warehouse {
  id: number
  reference: string | null
  name: string
  managementType: 'WA' | 'FIFO' | 'LIFO'
  address1: string | null
  address2: string | null
  postcode: string | null
  city: string | null
  phone: string | null
  phoneMobile: string | null
  country: string | null
  nbProducts: number
  totalQty: number
}

const warehouses = ref<Warehouse[]>([])
const loading = ref(true)

const totalProducts = computed(() => warehouses.value.reduce((s, w) => s + (w.nbProducts || 0), 0))

function formatNum(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n || 0)
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; warehouses: Warehouse[] }>('/api/bo/warehouses')
    warehouses.value = res.warehouses || []
  } catch (e) {
    console.error('warehouses load failed', e)
    warehouses.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
