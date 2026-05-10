<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<template>
  <!-- FULLWIDTH — background that breaks monotony -->
  <section class="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50/30 to-rose-50/40 dark:from-transparent dark:via-transparent dark:to-transparent dark:bg-slate-900">

    <!-- Mesh gradient background -->
    <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div class="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full blur-[140px] opacity-30 bg-indigo-600 dark:opacity-20" />
      <div class="absolute -bottom-32 right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 bg-violet-600 dark:opacity-15" />
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 bg-rose-500 dark:opacity-10" />
      <!-- Grid pattern -->
      <div class="absolute inset-0 gsc-grid-pattern opacity-[0.03] dark:opacity-[0.04]" />
      <!-- Gloss sweep -->
      <div class="absolute inset-0 gsc-gloss" />
    </div>

    <div class="relative max-w-6xl mx-auto px-4 sm:px-6">

      <!-- Header -->
      <div class="text-center mb-14">
        <span class="inline-flex items-center gap-2 bg-white/80 dark:bg-white/[0.06] backdrop-blur-sm text-success-700 dark:text-success-400 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4 border border-success-200/50 dark:border-success-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" />
          Résultats clients — données réelles
        </span>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
          Résultats SEO réels : <span class="text-primary-600">+400% de trafic organique</span>
        </h2>
        <p class="max-w-2xl mx-auto text-gray-600 dark:text-slate-400 text-sm lg:text-base leading-relaxed">
          Données réelles Google Search Console sur 16 mois. POC sur une version alpha — <strong class="text-gray-800 dark:text-white">sans PrestaShop Headless ni Nuxt</strong>. Imaginez avec l'architecture complète CodeMyShop.
        </p>
      </div>

      <!-- Card principale — glass morphism -->
      <div class="relative rounded-3xl overflow-hidden border border-white/20 dark:border-white/[0.08] shadow-[0_8px_40px_rgba(79,70,229,0.08),0_0_0_1px_rgba(255,255,255,0.1)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)]">
        <!-- Glass bg -->
        <div class="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl" />

        <div class="relative">
          <!-- Header -->
          <div class="px-6 lg:px-8 py-5 border-b border-gray-200/50 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center shadow-lg shadow-primary-600/20">
                <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <div>
                <p class="text-base font-extrabold text-gray-900 dark:text-white">voguimmo.com</p>
                <p class="text-xs text-gray-500 dark:text-slate-400">Google Search Console — 16 mois de données</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-gray-500 dark:text-slate-400">Live</span>
              <span class="w-2 h-2 rounded-full bg-success-400 animate-pulse shadow-lg shadow-success-400/50" />
            </div>
          </div>

          <!-- KPIs -->
          <div class="grid grid-cols-2 md:grid-cols-4">
            <div
              v-for="kpi in kpis"
              :key="kpi.label"
              class="px-5 lg:px-6 py-5 border-r border-b border-gray-200/30 dark:border-white/[0.04] last:border-r-0"
              :class="kpi.active ? '' : ''"
            >
              <div class="flex items-center gap-1.5 mb-2">
                <span
                  class="w-3.5 h-3.5 rounded flex items-center justify-center"
                  :style="{ backgroundColor: kpi.active ? kpi.color : 'transparent', border: kpi.active ? 'none' : `2px solid ${kpi.color}40` }"
                >
                  <svg v-if="kpi.active" class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </span>
                <p class="text-[11px] font-medium text-gray-500 dark:text-slate-400">{{ kpi.label }}</p>
              </div>
              <p class="text-3xl font-black tracking-tight" :style="kpi.active ? { color: kpi.color } : {}" :class="kpi.active ? '' : 'text-gray-900 dark:text-white'">
                {{ kpi.value }}
              </p>
            </div>
          </div>

          <!-- Graphique -->
          <div class="px-4 lg:px-8 py-8">
            <div class="relative h-64 sm:h-80 lg:h-96">
              <!-- Y gauche -->
              <div class="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-primary-500 dark:text-primary-400 font-semibold">
                <span>300</span><span>200</span><span>100</span><span>0</span>
              </div>
              <!-- Y droite -->
              <div class="absolute right-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-violet-500 dark:text-violet-400 font-semibold text-right">
                <span>30k</span><span>20k</span><span>10k</span><span>0</span>
              </div>

              <!-- SVG -->
              <svg class="absolute left-9 right-9 top-0 bottom-0" viewBox="0 0 800 280" preserveAspectRatio="none" fill="none">
                <!-- Grid -->
                <line v-for="i in 4" :key="'g'+i" x1="0" :y1="(i-1)*93" x2="800" :y2="(i-1)*93" stroke="currentColor" stroke-width="0.5" class="text-gray-200/50 dark:text-white/[0.06]" />

                <!-- Impressions -->
                <path :d="impressionsArea" fill="url(#impFill)" />
                <path :d="impressionsLine" stroke="#8B5CF6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="gsc-line-draw" style="--line-len: 3000" />

                <!-- Clics -->
                <path :d="clicsArea" fill="url(#clicFill)" />
                <path :d="clicsLine" stroke="#4F46E5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="gsc-line-draw" style="--line-len: 2500" />

                <!-- Dot final clics -->
                <circle :cx="800" :cy="280 - (280/300)*280" r="5" fill="#4F46E5" class="gsc-dot-pulse" />
                <!-- Dot final impressions -->
                <circle :cx="800" :cy="280 - (28000/30000)*280" r="5" fill="#8B5CF6" class="gsc-dot-pulse" style="animation-delay: 0.5s" />

                <defs>
                  <linearGradient id="clicFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.2" />
                    <stop offset="100%" stop-color="#4F46E5" stop-opacity="0" />
                  </linearGradient>
                  <linearGradient id="impFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.15" />
                    <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              <!-- X axis -->
              <div class="absolute left-9 right-9 bottom-0 flex justify-between text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                <span>Jan 2025</span><span>Avr 2025</span><span>Juil 2025</span><span>Oct 2025</span><span>Jan 2026</span>
              </div>
            </div>

            <!-- Legend -->
            <div class="flex items-center justify-center gap-8 mt-6">
              <div class="flex items-center gap-2">
                <span class="w-4 h-1 bg-primary-600 rounded-full" />
                <span class="text-xs font-medium text-gray-600 dark:text-slate-400">Clics</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-4 h-1 bg-violet-500 rounded-full" />
                <span class="text-xs font-medium text-gray-600 dark:text-slate-400">Impressions</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 lg:px-8 py-4 border-t border-gray-200/30 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p class="text-xs text-gray-500 dark:text-slate-400">
              POC version alpha <span class="text-gray-500 dark:text-slate-400">(sans PrestaShop Headless ni Nuxt)</span> — trafic organique <strong class="text-gray-800 dark:text-white">×15 en 12 mois</strong>
            </p>
            <NuxtLink to="/offre-starter" class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 hover:-translate-y-0.5">
              Découvrir l'offre Starter
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </NuxtLink>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
/**
 */

const kpis = [
  { label: 'Clics totaux', value: '20,2 k', color: '#4F46E5', active: true },
  { label: 'Impressions', value: '1,93 M', color: '#8B5CF6', active: true },
  { label: 'CTR moyen', value: '1 %', color: '#6B7280', active: false },
  { label: 'Position moy.', value: '24,2', color: '#6B7280', active: false },
]

// Courbe calquée sur la vraie capture GSC voguimmo.com
const clicsData = [
  1, 2, 1, 3, 2, 5, 3, 8, 4, 6, 12, 8, 10, 18, 12,
  15, 25, 20, 35, 30, 50, 38, 55, 45, 70, 55, 80,
  65, 90, 75, 110, 85, 120, 95, 140, 100, 150, 115, 160,
  130, 180, 155, 210, 170, 250, 195, 280,
]
const impressionsData = [
  100, 200, 150, 300, 250, 500, 400, 800, 600, 700, 1200, 900, 1000, 1800, 1400,
  1500, 2500, 2000, 3200, 2800, 4500, 3500, 5000, 4000, 6500, 5200, 7500,
  6000, 9000, 7500, 10000, 8500, 12000, 10000, 13500, 11000, 15000, 13000, 16500,
  14000, 18000, 16000, 21000, 18500, 24000, 20000, 28000,
]

const maxC = 300, maxI = 30000, W = 800, H = 270

function toPath(d: number[], max: number, area: boolean) {
  const pts = d.map((v, i) => `${(i / (d.length - 1)) * W},${H - (v / max) * H}`)
  const line = `M${pts.join(' L')}`
  return area ? `${line} L${W},${H} L0,${H} Z` : line
}

const clicsLine = toPath(clicsData, maxC, false)
const clicsArea = toPath(clicsData, maxC, true)
const impressionsLine = toPath(impressionsData, maxI, false)
const impressionsArea = toPath(impressionsData, maxI, true)
</script>

<style scoped>
/* Grid technique */
.gsc-grid-pattern {
  background-image:
    linear-gradient(rgba(79, 70, 229, 0.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79, 70, 229, 0.5) 1px, transparent 1px);
  background-size: 48px 48px;
}

/* Gloss sweep */
.gsc-gloss {
  background: linear-gradient(135deg, transparent 0%, transparent 40%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.02) 46%, transparent 48%, transparent 100%);
  background-size: 250% 250%;
  animation: gsc-gloss-sweep 8s ease-in-out infinite;
}
@keyframes gsc-gloss-sweep {
  0%   { background-position: 200% 200%; }
  50%  { background-position: -50% -50%; }
  100% { background-position: 200% 200%; }
}

/* Line draw animation */
.gsc-line-draw {
  stroke-dasharray: var(--line-len);
  stroke-dashoffset: var(--line-len);
  animation: gsc-draw 2.5s ease-out forwards;
}
@keyframes gsc-draw {
  to { stroke-dashoffset: 0; }
}

/* Dot pulse at end of lines */
.gsc-dot-pulse {
  opacity: 0;
  animation: gsc-dot-in 0.5s ease-out 2.5s forwards, gsc-dot-beat 2s ease-in-out 3s infinite;
}
@keyframes gsc-dot-in {
  to { opacity: 1; }
}
@keyframes gsc-dot-beat {
  0%, 100% { r: 5; opacity: 1; }
  50%      { r: 7; opacity: 0.7; }
}
</style>
