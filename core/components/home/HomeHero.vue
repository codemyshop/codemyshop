
<template>
  
  <section v-if="hero.layout === 'portfolio'" class="relative pt-28 md:pt-32 pb-10 md:pb-14 overflow-hidden" :class="heroBgClass">

    
    <div v-if="wowEffect" class="dark:hidden absolute inset-0 pointer-events-none" aria-hidden="true">
      
      <div class="absolute -top-20 -left-10 w-[550px] h-[550px] rounded-full blur-[130px] animate-energy-flow-1"
           style="background: radial-gradient(circle, rgba(79,70,229,0.18) 0%, rgba(99,102,241,0.10) 50%, transparent 70%)" />
      
      <div class="absolute top-[20%] right-[-5%] w-[450px] h-[450px] rounded-full blur-[110px] animate-energy-flow-2"
           style="background: radial-gradient(circle, rgba(13,148,136,0.15) 0%, rgba(20,184,166,0.08) 50%, transparent 70%)" />
      
      <div class="absolute inset-0 hero-gloss-overlay" />
    </div>

    
    <div v-if="wowEffect" class="dark:hidden absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F9FAFB] via-[#F9FAFB]/80 to-transparent pointer-events-none" aria-hidden="true" />

    
    <div v-if="wowEffect" class="hidden dark:block absolute inset-0 pointer-events-none" aria-hidden="true">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-hero-orb-1" />
      <div class="absolute top-10 right-[-80px] w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px] animate-hero-orb-2" />
      <div class="absolute -bottom-24 left-1/3 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[100px]" />
      <div class="absolute inset-0 hero-grid-pattern opacity-[0.04]" />
    </div>

    
    <div v-if="wowEffect" class="hidden dark:block absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" aria-hidden="true" />

    <div class="relative max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center gap-8 md:gap-12">

      
      <div class="flex-1">
        
        <div v-if="hero.badge" class="inline-flex items-center gap-2 bg-success-50 text-success-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span class="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
          {{ heroBadge }}
        </div>

        <h1 class="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-gray-900 dark:text-slate-100 leading-tight mb-5 tracking-tight" v-html="heroTitle" />

        <p v-if="heroSubtitle" class="text-base text-gray-500 dark:text-slate-400 mb-5 leading-relaxed max-w-xl">
          {{ heroSubtitle }}
        </p>

        
        <div v-if="hero.tags?.length" class="flex flex-wrap gap-1.5 mb-6">
          <span
            v-for="tag in hero.tags" :key="tag"
            class="text-xs font-semibold bg-primary-50 text-primary-600 dark:bg-primary-600/15 dark:text-primary-400 px-3 py-1.5 rounded-full"
          >{{ tag }}</span>
        </div>

        
        <div v-if="hero.quote" class="flex items-start gap-2 mb-5 p-3 rounded-lg bg-white/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] max-w-lg">
          <span class="text-accent-500 text-xl leading-none shrink-0">"</span>
          <div>
            <p class="text-sm text-gray-700 dark:text-slate-300 italic leading-relaxed">{{ hero.quote.text }}</p>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1.5 font-medium">— {{ hero.quote.author }}</p>
          </div>
        </div>

      </div>

      
      <div v-if="hero.image" class="flex flex-col items-center shrink-0">
        <div class="relative">
          
          <div class="dark:hidden absolute inset-0 rounded-full scale-[1.18]">
            <div class="absolute inset-0 rounded-full"
                 style="background: conic-gradient(from 0deg, rgba(79,70,229,0.25), rgba(13,148,136,0.20), rgba(99,102,241,0.15), rgba(13,148,136,0.20), rgba(79,70,229,0.25))" />
            <div class="absolute inset-[-6px] rounded-full blur-xl"
                 style="background: conic-gradient(from 180deg, rgba(79,70,229,0.15), rgba(13,148,136,0.10), rgba(79,70,229,0.15))" />
          </div>
          
          <div class="dark:hidden absolute inset-[-12px] rounded-full blur-xl animate-hero-pulse"
               style="background: radial-gradient(circle, rgba(79,70,229,0.25) 0%, rgba(13,148,136,0.15) 50%, transparent 70%)" />
          
          <div class="hidden dark:block absolute inset-0 rounded-full scale-[1.15]">
            <div class="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-blue-500/10 animate-hero-glow" />
            <div class="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-indigo-500/20 to-transparent blur-xl" />
          </div>
          <img
            :src="hero.image"
            :alt="heroAlt"
            class="relative w-52 h-52 md:w-64 md:h-64 rounded-full object-cover object-top shadow-[0_8px_30px_rgba(79,70,229,0.12),0_0_60px_rgba(13,148,136,0.06)] ring-4 ring-white/80 dark:ring-slate-700/50 dark:shadow-[0_0_40px_rgba(99,102,241,0.2)]"
            width="256" height="256"
            loading="eager"
            fetchpriority="high"
            data-no-filter
          />
        </div>

        
        <div class="flex flex-wrap gap-3 mt-8 justify-center w-full">
          <a
            v-if="hero.cta"
            :href="available ? hero.cta.href : undefined"
            :target="available && hero.cta.href.startsWith('http') ? '_blank' : undefined"
            :rel="available && hero.cta.href.startsWith('http') ? 'noopener noreferrer' : undefined"
            :class="available
              ? 'inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 cursor-pointer'
              : 'inline-flex items-center gap-2 px-6 py-3 bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-xl font-semibold cursor-not-allowed'"
          >
            <svg v-if="available && hero.cta.href.includes('calendly')" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {{ available ? t(hero.cta.label as any) : 'Complet ce mois-ci' }}
          </a>
        </div>

        
        <p class="text-[11px] text-gray-500 dark:text-slate-400 mt-3 leading-relaxed text-center max-w-sm mx-auto">
          Je ne vends pas mon temps. Je déploie un système.<br>
          <span class="text-gray-500 dark:text-slate-400 font-medium">C'est pourquoi je limite à {{ maxClients }} nouveaux clients par mois.</span>
        </p>
      </div>

    </div>
  </section>

  
  <section
    v-else
    class="relative overflow-hidden flex items-center"
    :class="hero.image ? 'min-h-[520px]' : 'min-h-[280px] bg-primary-50 dark:bg-primary-600/10'"
  >
    <template v-if="hero.image">
      <NuxtImg
        :src="hero.image"
        alt=""
        aria-hidden="true"
        class="absolute inset-0 w-full h-full object-cover"
        sizes="100vw sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw"
        preset="hero"
        loading="eager"
        fetchpriority="high"
      />
      <div class="absolute inset-0 bg-black/55" />
    </template>

    
    <NuxtLink
      v-if="hero.imageHref"
      :to="hero.imageHref"
      class="absolute inset-0 z-[1]"
      aria-label="Voir l'offre"
    />

    <div class="relative z-[2] w-full max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <h1
        class="text-4xl md:text-5xl font-extrabold leading-tight mb-5 max-w-3xl"
        :class="hero.image ? 'text-white' : 'text-foreground'"
        v-html="heroTitle"
      />

      <p
        v-if="heroSubtitle"
        class="text-lg mb-8 max-w-2xl leading-relaxed"
        :class="hero.image ? 'text-white/85' : 'text-muted'"
      >
        {{ heroSubtitle }}
      </p>

      <a
        v-if="hero.cta"
        :href="hero.cta.href"
        class="inline-flex items-center gap-2 px-7 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-btn transition-colors shadow-sm"
      >
        {{ t(hero.cta.label as any) }}
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HomepageHero } from '~/types/theme'

const props = defineProps<{
  hero: HomepageHero
  wowEffect?: boolean
}>()

const { t } = useI18nField()
const { tokens } = useDesignSystem()
const { available, remaining, maxClients } = useAvailability()

const heroTitle    = computed(() => t(props.hero.title as any))
const heroSubtitle = computed(() => t(props.hero.subtitle as any))
const heroBadge    = computed(() => t(props.hero.badge as any))
const heroAlt      = computed(() => heroTitle.value.replace(/<[^>]*>/g, ''))

const heroBgClass = computed(() =>
  props.wowEffect
    ? `${tokens.value.bgWow} ${tokens.value.bgWowDark}`
    : `${tokens.value.bgFlat} ${tokens.value.bgFlatDark}`,
)
</script>
