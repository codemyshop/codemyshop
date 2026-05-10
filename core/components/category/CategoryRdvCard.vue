<!--
  CategoryRdvCard — cartouche prise de RDV inspiré voguimmo.com.
  Layout 3 colonnes : avatar + intro / bullets de réassurance / CTA Calendly-like.
  Réutilisé dans CategoryPage (#contact) ET intercalé dans CategoryProductGrid
  toutes les N produits.

  Contenu via i18n keys (ps_translation), fallback générique FR.
  Chaque tenant remplit ses propres traductions DB (silo.rdv.*).

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
const { t } = useT()

withDefaults(
  defineProps<{
    ctaHref?: string
    /** Visual variant: 'card' (default) = bordered shadow, 'flat' = bg-light without border. */
    variant?: 'card' | 'flat'
  }>(),
  { ctaHref: '/rdv', variant: 'card' },
)

// Bullets: 6 keys, empty ones are skipped on the DB side (allows a tenant with 4 bullets).
const bulletKeys = ['1', '2', '3', '4', '5', '6'] as const
const bullets = computed<string[]>(() =>
  bulletKeys
    .map(k => t(`silo.rdv.bullet_${k}`))
    .filter(s => s && !s.startsWith('silo.rdv.')),
)

const avatarUrl = computed(() => t('silo.rdv.avatar_url'))
const hasAvatar = computed(() => !!avatarUrl.value && !avatarUrl.value.startsWith('silo.rdv.'))
</script>

<template>
  <div
    :class="[
      'rounded-xl p-6 sm:p-8',
      variant === 'card'
        ? 'border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
        : 'bg-slate-50 dark:bg-slate-900/40',
    ]"
  >
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
      <!-- Col 1 — Avatar + intro -->
      <div class="lg:col-span-5">
        <div class="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <NuxtLink
            v-if="hasAvatar"
            :to="ctaHref"
            class="shrink-0"
          >
            <!-- Avatar agent : asset 192x192 dans le volume nginx static
                 (example_static_img), hors public/ Nuxt → IPX KO.
                 width/height alignés sur la taille CSS rendue (h-24 w-24
                 = 96 CSS px) pour que le 192px serve naturellement de
                 source DPR2 sans warning Lighthouse "image plus grosse
                 que nécessaire". Pour DPR3+ ou écran retina large, on
                 conserve le 192 unique côté volume. -->
            <img
              :src="avatarUrl"
              :alt="t('silo.rdv.avatar_alt')"
              width="96"
              height="96"
              loading="lazy"
              class="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md ring-1 ring-slate-200 dark:ring-slate-700"
            />
          </NuxtLink>
          <div>
            <h2 class="text-xl font-bold text-primary-900 dark:text-primary-100">
              {{ t('silo.rdv.title') }}
            </h2>
            <p class="mt-1 text-base text-slate-700 dark:text-slate-300">
              {{ t('silo.rdv.tagline') }}
            </p>
            <p
              v-if="t('silo.rdv.expertise') && !t('silo.rdv.expertise').startsWith('silo.rdv.')"
              class="mt-1 text-sm text-slate-500 dark:text-slate-400"
            >
              {{ t('silo.rdv.expertise') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Col 2 — Reassurance bullets -->
      <ul
        v-if="bullets.length"
        class="hidden space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 lg:col-span-4 lg:block"
      >
        <li v-for="(b, i) in bullets" :key="i" class="flex items-start gap-2">
          <span class="mt-0.5 font-bold text-primary-600 dark:text-primary-400">✓</span>
          <span>{{ b }}</span>
        </li>
      </ul>

      <!-- Col 3 — CTA -->
      <div class="text-center lg:col-span-3 lg:text-right">
        <NuxtLink
          :to="ctaHref"
          class="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-base font-bold text-white shadow transition hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
          </svg>
          <span>{{ t('silo.rdv.cta') }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
