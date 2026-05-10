<!--
  Détail événement — /evenements/{slug}/
  Hero, infos pratiques (date/lieu/prix), description, formulaire d'inscription,
  liste participants (consent), JSON-LD Event pour SEO.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

interface EventApi {
  id: number; slug: string; type: 'online' | 'irl' | 'hybrid'
  startAt: string; endAt: string | null; timezone: string
  venueName: string | null; venueAddress: string | null
  postcode: string | null; city: string | null; country: string | null
  lat: number | null; lng: number | null
  meetingUrl: string | null
  maxParticipants: number | null
  isFree: boolean; priceCents: number
  registrationOpen: boolean; registrationDeadline: string | null
  coverImageUrl: string | null
  status: string; showParticipants: boolean
  title: string; subtitle: string | null; descriptionHtml: string | null
  metaTitle: string | null; metaDescription: string | null
  registeredCount: number; seatsLeft: number | null
}

const route = useRoute()
const cfg = useRuntimeConfig()
const brand = String((cfg.public as any).brandName ?? '')
const psFrontUrl = String((cfg.public as any).psFrontUrl ?? '')
const { activeLang } = useRouteLang()

const { data, error } = await useFetch<{ event: EventApi; participants: Array<{ name: string }> }>(
  `/api/events/${route.params.slug}`,
  { query: { lang: activeLang }, watch: [activeLang] },
)

if (error.value || !data.value?.event) {
  throw createError({ statusCode: 404, statusMessage: 'Événement introuvable', fatal: true })
}

const ev = computed(() => data.value!.event)
const participants = computed(() => data.value!.participants)

// Form state
const form = ref({ email: '', name: '', phone: '', attendeesCount: 1, note: '', consent: false })
const submitting = ref(false)
const submitted = ref(false)
const submitError = ref<string | null>(null)
const cancelToken = ref<string | null>(null)

async function submit() {
  submitError.value = null
  submitting.value = true
  try {
    const res = await $fetch<{ ok: boolean; cancelToken?: string; alreadyRegistered?: boolean }>(
      `/api/events/${route.params.slug}/register`,
      {
        method: 'POST',
        body: {
          email: form.value.email,
          name: form.value.name,
          phone: form.value.phone || undefined,
          attendeesCount: form.value.attendeesCount,
          note: form.value.note || undefined,
          consentParticipantsList: form.value.consent,
        },
      },
    )
    submitted.value = true
    cancelToken.value = res.cancelToken || null
  } catch (e: any) {
    submitError.value = e?.data?.statusMessage || e?.message || 'Erreur'
  } finally {
    submitting.value = false
  }
}

const TYPE_LABEL: Record<string, string> = { online: '🎥 En ligne', irl: '📍 Sur place', hybrid: '🌍 Hybride' }

function formatLong(s: string): string {
  return new Date(s).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const isComplet = computed(() => ev.value.maxParticipants ? ev.value.registeredCount >= ev.value.maxParticipants : false)
const isClosed = computed(() => !ev.value.registrationOpen
  || (ev.value.registrationDeadline && new Date(ev.value.registrationDeadline) < new Date()))

// JSON-LD Event for SEO
const jsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: ev.value.title,
  description: ev.value.metaDescription || ev.value.subtitle || undefined,
  startDate: ev.value.startAt,
  endDate: ev.value.endAt || undefined,
  eventAttendanceMode: ev.value.type === 'online'
    ? 'https://schema.org/OnlineEventAttendanceMode'
    : ev.value.type === 'hybrid'
    ? 'https://schema.org/MixedEventAttendanceMode'
    : 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: ev.value.status === 'cancelled'
    ? 'https://schema.org/EventCancelled'
    : 'https://schema.org/EventScheduled',
  url: `${psFrontUrl}/evenements/${ev.value.slug}/`,
  image: ev.value.coverImageUrl ? `${psFrontUrl}${ev.value.coverImageUrl}` : undefined,
  location: ev.value.type === 'online' ? {
    '@type': 'VirtualLocation',
    url: ev.value.meetingUrl || `${psFrontUrl}/evenements/${ev.value.slug}/`,
  } : {
    '@type': 'Place',
    name: ev.value.venueName,
    address: {
      '@type': 'PostalAddress',
      streetAddress: ev.value.venueAddress,
      postalCode: ev.value.postcode,
      addressLocality: ev.value.city,
      addressCountry: ev.value.country,
    },
    geo: ev.value.lat && ev.value.lng ? {
      '@type': 'GeoCoordinates',
      latitude: ev.value.lat,
      longitude: ev.value.lng,
    } : undefined,
  },
  offers: {
    '@type': 'Offer',
    price: ev.value.priceCents / 100,
    priceCurrency: 'EUR',
    availability: isComplet.value ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    url: `${psFrontUrl}/evenements/${ev.value.slug}/`,
  },
  organizer: {
    '@type': 'Organization',
    name: brand,
    url: psFrontUrl,
  },
}))

useHead(() => ({
  title: ev.value.metaTitle || `${ev.value.title} — ${brand}`,
  meta: [
    { name: 'description', content: ev.value.metaDescription || ev.value.subtitle || `Événement ${brand} : ${ev.value.title}` },
    { property: 'og:title', content: ev.value.title },
    { property: 'og:type', content: 'event' },
    { property: 'og:url', content: `${psFrontUrl}/evenements/${ev.value.slug}/` },
    ...(ev.value.coverImageUrl ? [{ property: 'og:image', content: `${psFrontUrl}${ev.value.coverImageUrl}` }] : []),
  ],
  link: [{ rel: 'canonical', href: `${psFrontUrl}/evenements/${ev.value.slug}/` }],
  script: [{ type: 'application/ld+json', children: JSON.stringify(jsonLd.value) }],
}))
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="bg-white">
      <!-- Hero -->
      <div class="relative bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
        <div class="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <nav class="text-xs text-gray-400 mb-4">
            <NuxtLink to="/" class="hover:text-gray-600">Accueil</NuxtLink>
            <span class="mx-1.5">/</span>
            <NuxtLink to="/evenements/" class="hover:text-gray-600">Événements</NuxtLink>
            <span class="mx-1.5">/</span>
            <span class="text-gray-700 truncate inline-block max-w-[300px] align-bottom">{{ ev.title }}</span>
          </nav>
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span class="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 bg-emerald-100 text-emerald-800">{{ TYPE_LABEL[ev.type] }}</span>
            <span v-if="ev.isFree" class="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 bg-amber-100 text-amber-800">Gratuit</span>
            <span v-if="isComplet" class="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 bg-red-100 text-red-800">Complet</span>
          </div>
          <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">{{ ev.title }}</h1>
          <p v-if="ev.subtitle" class="text-gray-600 text-lg max-w-3xl">{{ ev.subtitle }}</p>
        </div>
      </div>

      <div class="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        <!-- Colonne gauche : description + image -->
        <div class="space-y-8">
          <img v-if="ev.coverImageUrl" :src="ev.coverImageUrl" :alt="ev.title" class="w-full rounded-lg border border-gray-200" />
          <section v-if="ev.descriptionHtml" class="prose prose-sm sm:prose max-w-none text-gray-700" v-html="ev.descriptionHtml"></section>
          <section v-if="ev.showParticipants && participants.length" class="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">{{ participants.length }} participant{{ participants.length > 1 ? 's' : '' }} inscrits</h2>
            <ul class="flex flex-wrap gap-2">
              <li v-for="(p, i) in participants" :key="i" class="text-sm bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-700">{{ p.name }}</li>
            </ul>
          </section>
        </div>

        <!-- Colonne droite : infos + form -->
        <aside class="space-y-6">
          <div class="rounded-lg border border-gray-200 bg-white p-5 space-y-3 text-sm">
            <p class="flex items-start gap-2">
              <span aria-hidden="true">📅</span>
              <span>
                <span class="block font-medium text-gray-900">{{ formatLong(ev.startAt) }}</span>
                <span v-if="ev.endAt" class="block text-xs text-gray-500">jusqu'au {{ formatLong(ev.endAt) }}</span>
              </span>
            </p>
            <p v-if="ev.venueName || ev.venueAddress" class="flex items-start gap-2">
              <span aria-hidden="true">📍</span>
              <span>
                <span v-if="ev.venueName" class="block font-medium text-gray-900">{{ ev.venueName }}</span>
                <span v-if="ev.venueAddress" class="block text-gray-600">{{ ev.venueAddress }}</span>
                <span v-if="ev.postcode || ev.city" class="block text-gray-600">{{ ev.postcode }} {{ ev.city }}</span>
              </span>
            </p>
            <p v-if="ev.type === 'online' && ev.meetingUrl" class="flex items-start gap-2">
              <span aria-hidden="true">🎥</span>
              <span>Lien envoyé par email après inscription</span>
            </p>
            <p class="flex items-start gap-2 border-t border-gray-100 pt-3">
              <span aria-hidden="true">{{ ev.isFree ? '🎁' : '€' }}</span>
              <span class="font-semibold">{{ ev.isFree ? 'Gratuit' : (ev.priceCents / 100).toFixed(2) + ' €' }}</span>
            </p>
            <p class="flex items-start gap-2">
              <span aria-hidden="true">👥</span>
              <span>{{ ev.registeredCount }}<template v-if="ev.maxParticipants"> / {{ ev.maxParticipants }}</template> inscrit{{ ev.registeredCount > 1 ? 's' : '' }}<template v-if="ev.seatsLeft !== null && ev.seatsLeft > 0 && ev.seatsLeft <= 5"> · <span class="text-amber-700 font-medium">{{ ev.seatsLeft }} place{{ ev.seatsLeft > 1 ? 's' : '' }} restante{{ ev.seatsLeft > 1 ? 's' : '' }}</span></template></span>
            </p>
          </div>

          <!-- Form inscription -->
          <div v-if="submitted" class="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm">
            <p class="font-semibold text-emerald-800 mb-2">✓ Inscription confirmée</p>
            <p class="text-emerald-700">Tu reçois un récap par email. À très vite !</p>
          </div>
          <form v-else-if="!isClosed && !isComplet" @submit.prevent="submit" class="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
            <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide">S'inscrire</h2>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Nom complet *</label>
              <input v-model="form.name" required type="text" minlength="2" maxlength="128"
                     class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input v-model="form.email" required type="email"
                     class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Téléphone (optionnel)</label>
              <input v-model="form.phone" type="tel" maxlength="32"
                     class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Nombre de personnes</label>
              <input v-model.number="form.attendeesCount" type="number" min="1" max="10"
                     class="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Message (optionnel)</label>
              <textarea v-model="form.note" rows="2" maxlength="1000"
                        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"></textarea>
            </div>
            <label class="flex items-start gap-2 text-xs text-gray-600">
              <input v-model="form.consent" type="checkbox" class="mt-0.5" />
              <span>J'accepte d'apparaître dans la liste publique des participants (prénom + initiale du nom).</span>
            </label>
            <p v-if="submitError" class="text-xs text-red-600">{{ submitError }}</p>
            <button type="submit" :disabled="submitting"
                    class="w-full px-5 py-2.5 rounded-md bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {{ submitting ? 'Envoi…' : 'Je m\'inscris' }}
            </button>
          </form>
          <div v-else class="rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
            <p v-if="isComplet" class="font-medium text-gray-900">Événement complet</p>
            <p v-else class="font-medium text-gray-900">Inscriptions fermées</p>
            <p class="mt-1 text-xs">Reviens pour un prochain événement — suis-nous sur les réseaux pour ne rien rater.</p>
          </div>
        </aside>
      </div>
    </div>
  </NuxtLayout>
</template>
