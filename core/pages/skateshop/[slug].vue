<!--
  Page détail skateshop — /skateshop/{slug}/
  Fiche complète d'un magasin physique : hero + adresse + horaires + map
  + description + JSON-LD LocalBusiness pour SEO local (Google Maps,
  Knowledge Panel, "skateshop {ville}" rich result).

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

interface Store {
  id: number; slug: string; name: string
  addressLine1: string; addressLine2?: string | null
  postcode: string; city: string; region?: string | null; country: string
  lat: number; lng: number
  phone?: string | null; email?: string | null; websiteUrl?: string | null
  hours?: Record<string, string> | null
  hasWorkshop: boolean; hasSchool: boolean
  description?: string | null; metaTitle?: string | null; metaDescription?: string | null
}

const route = useRoute()
const cfg = useRuntimeConfig()
const brand = String((cfg.public as any).brandName ?? '')
const psFrontUrl = String((cfg.public as any).psFrontUrl ?? '')
const { activeLang } = useRouteLang()

const { data, error } = await useFetch<{ store: Store }>(`/api/stores/${route.params.slug}`, {
  query: { lang: activeLang },
  watch: [activeLang],
})

if (error.value || !data.value?.store) {
  throw createError({ statusCode: 404, statusMessage: 'Skateshop introuvable', fatal: true })
}

const store = computed(() => data.value!.store)

const dayLabels: Record<string, string> = {
  mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi', thu: 'Jeudi', fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche',
}
const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const hoursList = computed(() => {
  const h = store.value.hours
  if (!h) return []
  return dayKeys.map((k) => ({
    day: dayLabels[k],
    value: h[k] === 'closed' ? 'Fermé' : (h[k] || ''),
    closed: h[k] === 'closed',
  }))
})

// JSON-LD LocalBusiness — ranking key on "skateshop {city}"
const dayMap: Record<string, string> = { mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th', fri: 'Fr', sat: 'Sa', sun: 'Su' }
const openingHoursSpec = computed(() => {
  const h = store.value.hours
  if (!h) return []
  const spec: any[] = []
  for (const k of dayKeys) {
    if (!h[k] || h[k] === 'closed') continue
    const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(h[k])
    if (!m) continue
    spec.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${{ Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' }[dayMap[k]]}`,
      opens: m[1].length === 4 ? `0${m[1]}` : m[1],
      closes: m[2].length === 4 ? `0${m[2]}` : m[2],
    })
  }
  return spec
})

const jsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'SportingGoodsStore',
  '@id': `${psFrontUrl}/skateshop/${store.value.slug}/`,
  name: store.value.name,
  description: store.value.metaDescription || `Skateshop ${brand} à ${store.value.city}.`,
  url: `${psFrontUrl}/skateshop/${store.value.slug}/`,
  telephone: store.value.phone || undefined,
  email: store.value.email || undefined,
  address: {
    '@type': 'PostalAddress',
    streetAddress: [store.value.addressLine1, store.value.addressLine2].filter(Boolean).join(', '),
    postalCode: store.value.postcode,
    addressLocality: store.value.city,
    addressRegion: store.value.region || undefined,
    addressCountry: store.value.country,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: store.value.lat,
    longitude: store.value.lng,
  },
  openingHoursSpecification: openingHoursSpec.value,
  priceRange: '€€',
  areaServed: store.value.city,
}))

useHead(() => ({
  title: store.value.metaTitle || `${store.value.name} — ${brand}`,
  meta: [
    { name: 'description', content: store.value.metaDescription || `Skateshop ${brand} à ${store.value.city} — decks, trucks, roues, chaussures, textile.` },
    { property: 'og:title', content: store.value.metaTitle || `${store.value.name} — ${brand}` },
    { property: 'og:type', content: 'place' },
    { property: 'og:url', content: `${psFrontUrl}/skateshop/${store.value.slug}/` },
  ],
  link: [
    { rel: 'canonical', href: `${psFrontUrl}/skateshop/${store.value.slug}/` },
    { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=', crossorigin: '' },
  ],
  script: [
    { type: 'application/ld+json', children: JSON.stringify(jsonLd.value) },
  ],
}))

onMounted(async () => {
  if (typeof window === 'undefined') return
  if (!(window as any).L) {
    await new Promise<void>((resolve) => {
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = () => resolve()
      document.head.appendChild(s)
    })
  }
  const L = (window as any).L
  const mapEl = document.getElementById('skateshop-detail-map')
  if (!L || !mapEl || !store.value) return

  const map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false }).setView([store.value.lat, store.value.lng], 15)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap · © CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)
  L.marker([store.value.lat, store.value.lng]).addTo(map)
    .bindPopup(`<strong>${store.value.name}</strong><br>${store.value.addressLine1}<br>${store.value.postcode} ${store.value.city}`)
    .openPopup()
})

const phoneHref = computed(() => store.value.phone ? `tel:${store.value.phone.replace(/[^+\d]/g, '')}` : '')
const directionsHref = computed(() => `https://www.google.com/maps/dir/?api=1&destination=${store.value.lat},${store.value.lng}`)
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="bg-white">
      <!-- Hero -->
      <div class="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div class="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <nav class="text-xs text-gray-400 mb-4">
            <NuxtLink to="/" class="hover:text-gray-600">Accueil</NuxtLink>
            <span class="mx-1.5">/</span>
            <NuxtLink to="/skateshop/" class="hover:text-gray-600">Skateshops</NuxtLink>
            <span class="mx-1.5">/</span>
            <span class="text-gray-700">{{ store.city }}</span>
          </nav>
          <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">{{ store.name }}</h1>
          <p class="text-gray-600 text-lg">{{ store.addressLine1 }} · {{ store.postcode }} {{ store.city }}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span v-if="store.hasWorkshop" class="inline-flex items-center text-xs font-medium text-amber-800 bg-amber-100 rounded-full px-2.5 py-1">🔧 Atelier sur place</span>
            <span v-if="store.hasSchool"   class="inline-flex items-center text-xs font-medium text-emerald-800 bg-emerald-100 rounded-full px-2.5 py-1">🎓 École de skate</span>
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        <!-- Colonne gauche : map + description -->
        <div class="space-y-8">
          <!-- Map -->
          <div class="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <div id="skateshop-detail-map" class="w-full h-[420px]"></div>
          </div>

          <!-- Description -->
          <section v-if="store.description" class="prose prose-sm sm:prose max-w-none text-gray-700" v-html="store.description"></section>

          <!-- Lower CTA -->
          <div class="flex flex-wrap gap-3">
            <a :href="directionsHref" target="_blank" rel="noopener"
               class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition">
              📍 Itinéraire Google Maps
            </a>
            <a v-if="store.phone" :href="phoneHref"
               class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-gray-300 text-gray-700 text-sm font-semibold hover:border-gray-400 transition">
              📞 Appeler
            </a>
          </div>
        </div>

        <!-- Colonne droite : sidebar contact + horaires -->
        <aside class="space-y-6">
          <div class="rounded-lg border border-gray-200 p-5 bg-white">
            <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Contact</h2>
            <ul class="space-y-3 text-sm">
              <li v-if="store.phone"><a :href="phoneHref" class="text-primary-700 hover:underline">📞 {{ store.phone }}</a></li>
              <li v-if="store.email"><a :href="`mailto:${store.email}`" class="text-primary-700 hover:underline break-all">✉️ {{ store.email }}</a></li>
              <li class="text-gray-600 pt-2 border-t border-gray-100">
                <p>{{ store.addressLine1 }}</p>
                <p v-if="store.addressLine2">{{ store.addressLine2 }}</p>
                <p>{{ store.postcode }} {{ store.city }}</p>
                <p v-if="store.region" class="text-gray-400 text-xs mt-1">{{ store.region }}</p>
              </li>
            </ul>
          </div>

          <div v-if="hoursList.length" class="rounded-lg border border-gray-200 p-5 bg-white">
            <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Horaires</h2>
            <ul class="space-y-1.5 text-sm">
              <li v-for="h in hoursList" :key="h.day" class="flex justify-between">
                <span class="font-medium text-gray-700">{{ h.day }}</span>
                <span :class="h.closed ? 'text-gray-400' : 'text-gray-800'">{{ h.value }}</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  </NuxtLayout>
</template>

<style>
#skateshop-detail-map { z-index: 0; }
</style>
