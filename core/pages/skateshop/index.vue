<!--
  Page store locator — /skateshop/
  Liste des magasins physiques du tenant + carte interactive Leaflet (CDN).
  Chaque card linke vers /skateshop/{slug}/ (page détail SEO local).
  Source DB : cs_store + cs_store_lang (filtre client_id+active=1).

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

interface Store {
  id: number
  slug: string
  name: string
  addressLine1: string
  addressLine2?: string | null
  postcode: string
  city: string
  region?: string | null
  country: string
  lat: number
  lng: number
  phone?: string | null
  email?: string | null
  websiteUrl?: string | null
  hours?: Record<string, string> | null
  hasWorkshop: boolean
  hasSchool: boolean
  description?: string | null
}

const cfg = useRuntimeConfig()
const brand = String((cfg.public as any).brandName ?? '')
const { activeLang } = useRouteLang()

const { data } = await useFetch<{ stores: Store[] }>('/api/stores', {
  query: { lang: activeLang },
  watch: [activeLang],
})

const stores = computed(() => data.value?.stores ?? [])
const search = ref('')
const filteredStores = computed(() => {
  if (!search.value) return stores.value
  const q = search.value.toLowerCase()
  return stores.value.filter((s) =>
    s.city.toLowerCase().includes(q) ||
    s.postcode.startsWith(q) ||
    s.name.toLowerCase().includes(q),
  )
})

function panTo(s: Store) {
  if (typeof window !== 'undefined' && (window as any).__storeMap) {
    ;(window as any).__storeMap.setView([s.lat, s.lng], 14)
  }
}

useHead({
  title: brand ? `Skateshops — ${brand}` : 'Nos skateshops',
  meta: [{ name: 'description', content: `Trouve le skateshop ${brand} le plus proche de chez toi. ${stores.value.length} boutiques en France — viens essayer le matos, on te conseille.` }],
  link: [
    { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=', crossorigin: '' },
  ],
})

// Leaflet init client-side only
onMounted(async () => {
  if (typeof window === 'undefined') return
  // Charge dynamiquement Leaflet via script tag
  if (!(window as any).L) {
    await new Promise<void>((resolve) => {
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = () => resolve()
      document.head.appendChild(s)
    })
  }
  const L = (window as any).L
  if (!L || !stores.value.length) return

  const mapEl = document.getElementById('store-map')
  if (!mapEl) return

  const map = L.map(mapEl)
  ;(window as any).__storeMap = map

  // Tile minimaliste gris (CartoDB Positron) — moins de bruit visuel
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap · © CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)

  for (const s of stores.value) {
    const marker = L.marker([s.lat, s.lng]).addTo(map)
    marker.bindPopup(`<strong>${s.name}</strong><br>${s.addressLine1}<br>${s.postcode} ${s.city}<br><a href="/skateshop/${s.slug}/" class="text-primary-700 underline">Voir la fiche →</a>`)
  }

  // fitBounds = encompasses all markers with padding; optimal auto-zoom
  // for mainland France (5 stores distributed = ~zoom 5-6).
  if (stores.value.length > 1) {
    const bounds = L.latLngBounds(stores.value.map((s) => [s.lat, s.lng]))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 })
  } else {
    map.setView([stores.value[0].lat, stores.value[0].lng], 13)
  }
})

// Short time format for the card: "Today 10am-7pm" or "Closed"
const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
function todayHours(hours: Record<string, string> | null | undefined): string | null {
  if (!hours) return null
  const today = dayKeys[new Date().getDay()]
  const v = hours[today]
  if (!v) return null
  if (v === 'closed') return "Fermé aujourd'hui"
  return `Ouvert · ${v.replace(':00', 'h').replace('-', '–')}`
}
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="bg-white">
      <!-- Hero -->
      <div class="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white py-12">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Nos skateshops</h1>
          <p class="text-gray-600 text-lg max-w-2xl">{{ stores.length }} boutiques {{ brand }} en France — viens essayer ton matos, on a le matos et on te conseille.</p>
        </div>
      </div>

      <div class="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <!-- Recherche -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Filtrer par ville ou code postal</label>
          <input v-model="search" type="text" placeholder="Lyon, 75011, Paris…"
                 class="w-full max-w-md rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
          <!-- Liste magasins -->
          <ul class="space-y-3 max-h-[640px] overflow-y-auto pr-2">
            <li v-for="s in filteredStores" :key="s.id" :id="`store-${s.slug}`" class="scroll-mt-24">
              <NuxtLink :to="`/skateshop/${s.slug}/`"
                        @mouseenter="panTo(s)"
                        class="block rounded-lg border border-gray-200 p-4 transition-all hover:border-primary-400 hover:shadow-sm">
                <div class="flex-1 min-w-0">
                  <h2 class="font-semibold text-gray-900 truncate">{{ s.name }}</h2>
                  <p class="text-sm text-gray-600 mt-1">{{ s.addressLine1 }}</p>
                  <p class="text-sm text-gray-600">{{ s.postcode }} {{ s.city }}</p>
                  <div class="mt-3 space-y-1 text-xs text-gray-500">
                    <p v-if="s.phone" class="flex items-center gap-1.5">
                      <span aria-hidden="true">📞</span><span class="font-medium text-gray-700">{{ s.phone }}</span>
                    </p>
                    <p v-if="todayHours(s.hours)" class="flex items-center gap-1.5">
                      <span aria-hidden="true">🕒</span>
                      <span :class="todayHours(s.hours)?.startsWith('Fermé') ? 'text-gray-400' : 'text-emerald-700 font-medium'">{{ todayHours(s.hours) }}</span>
                    </p>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-1.5">
                    <span v-if="s.hasWorkshop" class="inline-flex items-center text-[11px] font-medium text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">🔧 Atelier</span>
                    <span v-if="s.hasSchool" class="inline-flex items-center text-[11px] font-medium text-emerald-800 bg-emerald-100 rounded-full px-2 py-0.5">🎓 École</span>
                  </div>
                  <p class="mt-3 text-xs font-medium text-primary-700">Voir la fiche du skateshop {{ s.city }} →</p>
                </div>
              </NuxtLink>
            </li>
            <li v-if="!filteredStores.length" class="text-center text-gray-500 py-8">Aucun skateshop trouvé pour « {{ search }} »</li>
          </ul>

          <!-- Carte -->
          <div class="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <div id="store-map" class="w-full h-[640px]"></div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<style>
/* Force map size (Leaflet needs it) */
#store-map { z-index: 0; }
</style>
