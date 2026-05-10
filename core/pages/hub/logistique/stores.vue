<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Boutiques</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ stores.length }} boutique{{ stores.length > 1 ? 's' : '' }} · {{ activeCount }} active{{ activeCount > 1 ? 's' : '' }}</p>
      </div>
      <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Actualiser</button>
    </header>

    <div class="flex-1 overflow-auto p-6">
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-32 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!stores.length" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4">🏪</div>
        <p class="text-sm font-semibold text-gray-700 dark:text-slate-300">Aucune boutique configurée</p>
        <p class="text-xs text-gray-400 mt-2 max-w-md">Créez vos points de vente physiques dans PrestaShop (Préférences → Coordonnées → Boutiques) pour les afficher sur le store locator public et ici.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="s in stores"
          :key="s.id"
          class="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          :class="s.active ? 'border-gray-100 dark:border-slate-800' : 'border-gray-200 dark:border-slate-700 opacity-60'"
        >
          <div class="p-5">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl shrink-0">🏪</div>
                <div>
                  <p class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ s.name || '—' }}</p>
                  <p class="text-[10px] text-gray-400 uppercase tracking-wider">#{{ s.id }}</p>
                </div>
              </div>
              <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                :class="s.active ? 'bg-success-50 text-success-600' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'">
                {{ s.active ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <div class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-3">
              <p v-if="s.address1">{{ s.address1 }}</p>
              <p v-if="s.address2">{{ s.address2 }}</p>
              <p>{{ s.postcode }} {{ s.city }}<span v-if="s.country"> · {{ s.country }}</span></p>
              <p v-if="s.phone" class="mt-1 text-gray-400">📞 {{ s.phone }}</p>
              <p v-if="s.email" class="text-gray-400">✉️ {{ s.email }}</p>
            </div>

            <details v-if="s.hours" class="text-xs">
              <summary class="cursor-pointer text-primary-600 hover:text-primary-700 font-semibold">Horaires</summary>
              <pre class="mt-2 p-2 bg-gray-50 dark:bg-slate-800 rounded text-[10px] text-gray-600 dark:text-slate-400 whitespace-pre-wrap">{{ formatHours(s.hours) }}</pre>
            </details>

            <div v-if="s.latitude && s.longitude" class="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <span class="text-[10px] font-mono text-gray-400">{{ Number(s.latitude).toFixed(4) }}, {{ Number(s.longitude).toFixed(4) }}</span>
              <a :href="`https://www.google.com/maps?q=${s.latitude},${s.longitude}`" target="_blank" rel="noopener" class="text-[10px] font-semibold text-primary-600 hover:text-primary-700">Maps →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface Store {
  id: number
  active: number
  name: string | null
  address1: string | null
  address2: string | null
  postcode: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  latitude: string | null
  longitude: string | null
  hours: string | null
  note: string | null
}

const stores = ref<Store[]>([])
const loading = ref(true)

const activeCount = computed(() => stores.value.filter(s => s.active).length)

function formatHours(raw: string | null): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((d, i) => `Jour ${i + 1} : ${Array.isArray(d) ? d.join(' / ') : d}`).join('\n')
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; stores: Store[] }>('/api/bo/stores')
    stores.value = res.stores || []
  } catch (e) {
    console.error('stores load failed', e)
    stores.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
