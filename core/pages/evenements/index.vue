<!--
  Liste des événements — /evenements/
  Cards events à venir, filtre par type (online/IRL/hybrid).

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: false })

interface EventApi {
  id: number; slug: string; type: 'online' | 'irl' | 'hybrid'
  startAt: string; endAt: string | null; timezone: string
  venueName: string | null; city: string | null
  meetingUrl: string | null
  maxParticipants: number | null
  isFree: boolean; priceCents: number
  registrationOpen: boolean
  coverImageUrl: string | null
  title: string; subtitle: string | null
  registeredCount: number
}

const cfg = useRuntimeConfig()
const brand = String((cfg.public as any).brandName ?? '')
const { activeLang } = useRouteLang()

const { data } = await useFetch<{ events: EventApi[] }>('/api/events', {
  query: { lang: activeLang, upcoming: '1' },
  watch: [activeLang],
})

const events = computed(() => data.value?.events ?? [])
const filterType = ref<'all' | 'online' | 'irl' | 'hybrid'>('all')

const filteredEvents = computed(() => {
  if (filterType.value === 'all') return events.value
  return events.value.filter((e) => e.type === filterType.value)
})

useHead({
  title: brand ? `Événements à venir — ${brand}` : 'Événements à venir',
  meta: [{ name: 'description', content: `Tous les événements ${brand} : sessions skate, ateliers, contests, lives. Inscription en ligne.` }],
})

const TYPE_LABEL: Record<string, string> = { online: '🎥 En ligne', irl: '📍 Sur place', hybrid: '🌍 Hybride' }
const TYPE_COLOR: Record<string, string> = {
  online: 'bg-blue-100 text-blue-800',
  irl: 'bg-emerald-100 text-emerald-800',
  hybrid: 'bg-violet-100 text-violet-800',
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="bg-white">
      <div class="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white py-12">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Événements à venir</h1>
          <p class="text-gray-600 text-lg">{{ events.length }} événement{{ events.length > 1 ? 's' : '' }} {{ brand }} — sessions skate, ateliers, contests, lives.</p>
        </div>
      </div>

      <div class="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <!-- Filtre type -->
        <div class="mb-8 flex flex-wrap gap-2">
          <button v-for="opt in [
            { v: 'all',    l: 'Tous' },
            { v: 'irl',    l: '📍 Sur place' },
            { v: 'online', l: '🎥 En ligne' },
            { v: 'hybrid', l: '🌍 Hybride' },
          ]" :key="opt.v"
            @click="filterType = opt.v as any"
            :class="['rounded-full px-4 py-1.5 text-sm font-medium border transition-colors',
                     filterType === opt.v
                       ? 'bg-primary-600 text-white border-primary-600'
                       : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400']">
            {{ opt.l }}
          </button>
        </div>

        <!-- Grille events -->
        <div v-if="filteredEvents.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink v-for="ev in filteredEvents" :key="ev.id"
                    :to="`/evenements/${ev.slug}/`"
                    class="group rounded-lg border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow">
            <div v-if="ev.coverImageUrl" class="aspect-[16/9] bg-gray-100 overflow-hidden">
              <img :src="ev.coverImageUrl" :alt="ev.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
            </div>
            <div v-else class="aspect-[16/9] bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-5xl">
              {{ ev.type === 'online' ? '🎥' : ev.type === 'irl' ? '📍' : '🌍' }}
            </div>
            <div class="p-5">
              <div class="flex items-center gap-2 mb-3 flex-wrap">
                <span :class="['inline-flex items-center text-[11px] font-medium rounded-full px-2 py-0.5', TYPE_COLOR[ev.type]]">{{ TYPE_LABEL[ev.type] }}</span>
                <span v-if="ev.isFree" class="inline-flex items-center text-[11px] font-medium rounded-full px-2 py-0.5 bg-amber-100 text-amber-800">Gratuit</span>
                <span v-if="ev.maxParticipants && ev.registeredCount >= ev.maxParticipants" class="inline-flex items-center text-[11px] font-medium rounded-full px-2 py-0.5 bg-red-100 text-red-800">Complet</span>
              </div>
              <h2 class="text-lg font-semibold text-gray-900 group-hover:text-primary-700 mb-1.5 line-clamp-2">{{ ev.title }}</h2>
              <p v-if="ev.subtitle" class="text-sm text-gray-600 mb-3 line-clamp-2">{{ ev.subtitle }}</p>
              <div class="space-y-1.5 text-sm text-gray-500">
                <p class="flex items-center gap-1.5"><span aria-hidden="true">📅</span><span>{{ formatDate(ev.startAt) }}</span></p>
                <p v-if="ev.venueName || ev.city" class="flex items-center gap-1.5">
                  <span aria-hidden="true">📍</span>
                  <span class="truncate">{{ ev.venueName }}<template v-if="ev.venueName && ev.city"> — </template>{{ ev.city }}</span>
                </p>
                <p class="flex items-center gap-1.5">
                  <span aria-hidden="true">👥</span>
                  <span>{{ ev.registeredCount }}<template v-if="ev.maxParticipants"> / {{ ev.maxParticipants }}</template> inscrit{{ ev.registeredCount > 1 ? 's' : '' }}</span>
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>
        <div v-else class="text-center py-16">
          <p class="text-gray-500 text-lg">Aucun événement à venir pour le moment.</p>
          <p class="text-gray-400 text-sm mt-2">Reviens bientôt — ou suis-nous sur Insta pour être prévenu en premier.</p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
