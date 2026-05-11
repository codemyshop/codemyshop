
<template>
  <section class="relative py-16 lg:py-24 overflow-hidden bg-white dark:bg-slate-900">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">

      
      <div class="text-center mb-16">
        <span class="inline-block bg-primary-50 text-primary-600 dark:bg-primary-600/15 dark:text-primary-400 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
          Méthodologie e-commerce
        </span>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-4">
          La Flywheel CodeMyShop — de l'audit SEO à la croissance IA
        </h2>
        <p class="max-w-2xl mx-auto text-gray-500 dark:text-slate-400 text-sm lg:text-base leading-relaxed mb-4">
          Chaque étape nourrit la suivante. Plus le volant tourne, plus il accélère — exactement comme la Flywheel d'Amazon, mais pour votre souveraineté digitale.
        </p>
        <NuxtLink to="/flywheel" class="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline">Lire la théorie complète →</NuxtLink>
      </div>

      
      <div class="hidden lg:block">
        <div class="relative w-[720px] h-[720px] mx-auto">

          
          <svg class="absolute inset-0 w-full h-full" viewBox="0 0 720 720" fill="none">
            
            <circle cx="360" cy="360" r="280" stroke="currentColor" stroke-width="1" stroke-dasharray="8 6"
                    class="text-gray-200 dark:text-slate-700" />
            
            <circle cx="360" cy="360" r="280" stroke="url(#orbitalGrad)" stroke-width="2.5"
                    stroke-dasharray="200 1560" stroke-linecap="round"
                    class="orbital-arc" />
            
            <circle r="3" fill="url(#orbitalGrad)" class="orbital-particle">
              <animateMotion dur="12s" repeatCount="indefinite">
                <mpath href="#orbitPath" />
              </animateMotion>
            </circle>
            <circle r="2" fill="url(#orbitalGrad)" class="orbital-particle" opacity="0.5">
              <animateMotion dur="12s" repeatCount="indefinite" begin="4s">
                <mpath href="#orbitPath" />
              </animateMotion>
            </circle>
            <circle r="1.5" fill="url(#orbitalGrad)" class="orbital-particle" opacity="0.3">
              <animateMotion dur="12s" repeatCount="indefinite" begin="8s">
                <mpath href="#orbitPath" />
              </animateMotion>
            </circle>
            
            <path id="orbitPath" d="M640,360 A280,280 0 1,1 639.99,359.99" fill="none" />
            
            <defs>
              <linearGradient id="orbitalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4F46E5" />
                <stop offset="50%" stop-color="#8B5CF6" />
                <stop offset="100%" stop-color="#EC4899" />
              </linearGradient>
            </defs>
          </svg>

          
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 z-20">
            <div class="absolute inset-0 rounded-full bg-gradient-to-br from-primary-600 to-purple-600 opacity-20 blur-2xl animate-pulse" />
            <div class="relative w-full h-full rounded-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-indigo-500/20 shadow-[0_0_40px_rgba(79,70,229,0.1)] dark:shadow-[0_0_40px_rgba(99,102,241,0.15)] flex flex-col items-center justify-center text-center p-4">
              <div class="text-3xl mb-1 flywheel-icon">&#x267E;&#xFE0F;</div>
              <p class="text-xs font-extrabold text-gray-900 dark:text-white leading-tight">Flywheel</p>
              <p class="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">Chaque tour<br/>accélère le suivant</p>
            </div>
          </div>

          
          <div
            v-for="(step, i) in steps"
            :key="step.number"
            class="absolute z-10 w-56 group"
            :style="stepPositions[i]"
          >
            
            <div class="absolute w-px h-8 bg-gradient-to-b from-transparent via-gray-200 dark:via-slate-600 to-transparent" :style="connectorStyle[i]" />

            <div
              class="relative rounded-2xl p-5 border transition-all duration-500 cursor-default"
              :class="[
                'bg-white dark:bg-slate-900/80 dark:backdrop-blur-md',
                'border-gray-100 dark:border-white/[0.08]',
                'hover:border-primary-300 dark:hover:border-indigo-500/30',
                'hover:shadow-[0_8px_30px_rgba(79,70,229,0.08)] dark:hover:shadow-[0_8px_30px_rgba(99,102,241,0.12)]',
                'hover:-translate-y-1',
              ]"
            >
              
              <span class="absolute top-2 right-3 text-5xl font-black text-gray-900/[0.03] dark:text-white/[0.04] leading-none select-none pointer-events-none">
                {{ step.number }}
              </span>

              <div class="flex items-center gap-3 mb-3">
                <div
                  class="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110"
                  :style="{ background: step.color + '15' }"
                >
                  <span v-html="step.icon" />
                </div>
                <div>
                  <p class="text-[9px] font-bold uppercase tracking-widest" :style="{ color: step.color }">Étape {{ step.number }}</p>
                  <h3 class="text-xs font-extrabold text-gray-900 dark:text-white leading-tight">{{ step.title }}</h3>
                </div>
              </div>
              <p class="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed mb-3">{{ step.text }}</p>
              
              <div class="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                <span class="text-[10px] font-bold uppercase tracking-wider" :style="{ color: step.color }">{{ step.feeds }}</span>
              </div>
            </div>
          </div>

          
          <svg class="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 720 720" fill="none">
            <path v-for="(arrow, i) in arrowPaths" :key="i"
                  :d="arrow" stroke="url(#orbitalGrad)" stroke-width="1.5"
                  stroke-dasharray="4 3" opacity="0.4"
                  marker-end="url(#arrowHead)" />
            <defs>
              <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="none" stroke="url(#orbitalGrad)" stroke-width="1" />
              </marker>
            </defs>
          </svg>

        </div>
      </div>

      
      <div class="lg:hidden space-y-6">
        <div
          v-for="(step, i) in steps"
          :key="step.number"
          class="relative flex gap-4"
        >
          
          <div class="flex flex-col items-center shrink-0">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 z-10"
              :style="{ borderColor: step.color, background: step.color + '12' }"
            >
              <span v-html="step.icon" />
            </div>
            <div v-if="i < 3" class="flex-1 w-px bg-gradient-to-b from-gray-200 dark:from-slate-600 to-transparent mt-2" />
          </div>

          
          <div class="flex-1 rounded-2xl p-5 border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] dark:backdrop-blur-sm pb-8">
            <p class="text-[10px] font-bold uppercase tracking-widest mb-1" :style="{ color: step.color }">Étape {{ step.number }} — {{ step.subtitle }}</p>
            <h3 class="text-sm font-extrabold text-gray-900 dark:text-white mb-2">{{ step.title }}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-2">{{ step.text }}</p>
            <span class="text-[10px] font-bold uppercase tracking-wider" :style="{ color: step.color }">{{ step.feeds }}</span>
          </div>
        </div>

        
        <div class="text-center pt-4">
          <div class="inline-flex flex-col items-center gap-2 rounded-2xl border border-primary-200 dark:border-indigo-500/20 bg-white dark:bg-slate-900 px-8 py-5 shadow-[0_0_30px_rgba(79,70,229,0.08)] dark:shadow-[0_0_30px_rgba(99,102,241,0.12)]">
            <div class="text-3xl flywheel-icon">&#x267E;&#xFE0F;</div>
            <p class="text-sm font-extrabold text-gray-900 dark:text-white">Flywheel — Chaque tour accélère le suivant</p>
            <p class="text-xs text-gray-500 dark:text-slate-400 max-w-xs">Marque souveraine → Usine headless → Moteur IA → Traction → CA → Marque plus forte. Chaque tour accélère le suivant.</p>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
const steps = [
  {
    number: '01',
    icon: '&#x1F511;',
    title: 'La Marque',
    subtitle: 'Souveraineté',
    color: '#0D9488',
    text: "Votre domaine, votre VPS, votre identité. Vous possédez les murs et la marque — 0% de commission, 0 dépendance. Plus la Flywheel tourne, plus votre marque prend de la valeur.",
    feeds: 'Marque forte →',
  },
  {
    number: '02',
    icon: '&#x1F9F1;',
    title: "L'Usine Headless",
    subtitle: 'Architecture',
    color: '#4F46E5',
    text: "Nuxt 3 + PrestaShop sous Docker. La vitesse du headless décuple votre taux de conversion — chaque visiteur rapporte plus. Plus de CA = plus de budget pour le moteur IA.",
    feeds: 'Conversion accrue →',
  },
  {
    number: '03',
    icon: '&#x1F916;',
    title: 'Le Cerveau Analytique',
    subtitle: 'Données → IA → Contenu',
    color: '#8B5CF6',
    text: "L'IA écoute le marché avant de parler. Elle détecte ce que vos visiteurs cherchent, où ils bloquent, et ce qui manque à votre catalogue. Si une page convertit mal ou qu'une information manque, elle la corrige ou la crée la nuit même. Chaque visiteur affine la précision de votre machine.",
    feeds: 'Trafic organique →',
  },
  {
    number: '04',
    icon: '&#x1F4C8;',
    title: 'La Traction',
    subtitle: 'Croissance',
    color: '#F43F5E',
    text: "Le trafic organique alimente les ventes, le CA augmente. Chaque euro réinvesti dans l'IA renforce le contenu, le trafic, la conversion — et la valeur de votre marque. Le volant accélère à chaque tour.",
    feeds: 'CA → Valeur de marque →',
  },
]

const stepPositions = [
  'top: -20px; left: 50%; transform: translateX(-50%);',         
  'top: 50%; right: -30px; transform: translateY(-50%);',        
  'bottom: -20px; left: 50%; transform: translateX(-50%);',      
  'top: 50%; left: -30px; transform: translateY(-50%);',         
]

const connectorStyle = [
  'bottom: -32px; left: 50%; transform: translateX(-50%);',
  'left: -32px; top: 50%; transform: translateY(-50%) rotate(90deg);',
  'top: -32px; left: 50%; transform: translateX(-50%);',
  'right: -32px; top: 50%; transform: translateY(-50%) rotate(90deg);',
]

const arrowPaths = [
  'M360,80 A280,280 0 0,1 640,360',   
  'M640,360 A280,280 0 0,1 360,640',   
  'M360,640 A280,280 0 0,1 80,360',    
  'M80,360 A280,280 0 0,1 360,80',     
]
</script>

<style scoped>
/* Arc animé qui tourne autour de l'orbite */
.orbital-arc {
  transform-origin: center;
  animation: orbit-spin 12s linear infinite;
}
@keyframes orbit-spin {
  to { transform: rotate(360deg); }
}

/* Icône flywheel qui tourne doucement */
.flywheel-icon {
  animation: flywheel-rotate 8s linear infinite;
  display: inline-block;
}
@keyframes flywheel-rotate {
  to { transform: rotate(360deg); }
}

</style>
