<!--
  /**
   *
   * Homepage section: gift card promo. Activable via the builder
   * (insertion of a cs_homepage_section row type='giftcard-promo').
   *
   * All visible labels go through t() (rule 10bis CLAUDE.md).
   */
-->
<template>
  <ThemeSection variant="alt">
    <section class="max-w-6xl mx-auto px-6 py-16 sm:py-20">
      <div class="grid lg:grid-cols-2 gap-10 items-center">

        <!-- Visuel : carte stylée -->
        <div class="relative">
          <div
            class="aspect-[5/3] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-amber-400 relative"
          >
            <!-- Pattern subtil -->
            <div class="absolute inset-0 opacity-20"
              style="background-image: radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px); background-size: 30px 30px;"
              aria-hidden="true"
            />
            <div class="relative h-full flex flex-col justify-between p-8 text-white">
              <p class="text-[10px] tracking-[0.3em] uppercase opacity-80">
                {{ t('cartes_cadeaux.kicker') }}
              </p>
              <div>
                <p class="text-5xl font-light tracking-tight">{{ t('home_giftcard.preview_amount') }}</p>
                <p class="text-xs mt-3 opacity-80 font-mono tracking-wider">XXXX-XXXX-XXXX</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Texte + CTA -->
        <div class="space-y-5">
          <p class="text-[11px] tracking-[0.3em] uppercase text-primary-600">
            {{ resolvedTitle || t('home_giftcard.kicker') }}
          </p>
          <h2 class="text-3xl sm:text-4xl font-light text-gray-900 tracking-tight leading-tight">
            {{ resolvedSubtitle || t('home_giftcard.title') }}
          </h2>
          <p class="text-sm text-gray-600 leading-relaxed">
            {{ t('home_giftcard.body') }}
          </p>
          <ul class="text-sm text-gray-600 space-y-2 pt-2">
            <li class="flex items-start gap-2">
              <span class="text-primary-600">✓</span>
              <span>{{ t('home_giftcard.bullet_amounts') }}</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-primary-600">✓</span>
              <span>{{ t('home_giftcard.bullet_delivery') }}</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-primary-600">✓</span>
              <span>{{ t('home_giftcard.bullet_validity') }}</span>
            </li>
          </ul>
          <div class="pt-4">
            <NuxtLink
              :to="localePath('/cartes-cadeaux')"
              class="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {{ t('home_giftcard.cta') }}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
              </svg>
            </NuxtLink>
          </div>
        </div>

      </div>
    </section>
  </ThemeSection>
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string
  subtitle?: string
}>()

const { t } = useT()
const { localePath } = useLocalePath()

const resolvedTitle = computed(() => props.title || '')
const resolvedSubtitle = computed(() => props.subtitle || '')
</script>
