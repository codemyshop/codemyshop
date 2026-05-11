
<template>
  <section id="solution" class="py-20 lg:py-24 bg-gray-50 dark:bg-slate-900">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">

      <div class="text-center mb-14">
        <span class="inline-block bg-primary-50 text-primary-700 dark:bg-primary-600/15 dark:text-primary-400 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4">Ce que j'ai construit pour vous</span>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Un système complet. Pas un outil de plus.</h2>
        <p class="max-w-2xl mx-auto text-gray-500 dark:text-slate-400 text-sm lg:text-base leading-relaxed">Trois piliers dans une seule infrastructure souveraine, hébergée en France, sans commission sur vos ventes.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div v-for="pillar in pillars" :key="pillar.title" class="relative p-8 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          
          <div class="absolute top-0 left-8 right-8 h-[2px] rounded-full" :style="{ background: pillar.color }" />

          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5" :class="pillar.bgClass">
            {{ pillar.emoji }}
          </div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">{{ pillar.title }}</h3>
          <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mb-5">{{ pillar.desc }}</p>
          <ul class="space-y-2">
            <li v-for="feat in pillar.features" :key="feat" class="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-400">
              <svg class="w-4 h-4 text-primary-500 dark:text-primary-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              <span>{{ feat }}</span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
const pillars = [
  {
    emoji: '🏗️',
    title: 'Architecture Headless',
    desc: 'PrestaShop pour la puissance e-commerce. Nuxt 3 pour la vitesse et le SEO. Docker pour la souveraineté.',
    color: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
    bgClass: 'bg-indigo-50 dark:bg-indigo-500/10',
    features: [
      'Chargement en 1,2 seconde',
      'Core Web Vitals au vert',
      'Propriétaire de votre code',
      'Hébergement souverain France',
    ],
  },
  {
    emoji: '🤖',
    title: 'IA nourrie par vos données',
    desc: 'Vos données comportementales — ce que vos visiteurs cherchent, où ils abandonnent, ce qui convertit — restent sur votre serveur en France. Et notre IA les lit en temps réel pour savoir exactement quoi produire comme contenu.',
    color: 'linear-gradient(90deg, #ec4899, #f43f5e)',
    bgClass: 'bg-pink-50 dark:bg-pink-500/10',
    features: [
      'IA alimentée par vos propres données comportementales',
      'Détection automatique du contenu manquant',
      'Rédaction et publication sans intervention humaine',
      'Vos données ne financent jamais l\'IA de vos concurrents',
    ],
  },
  {
    emoji: '🎛️',
    title: 'Hub centralisé',
    desc: 'Un seul tableau de bord pour tout piloter. Plus besoin de 6 outils qui ne communiquent pas.',
    color: 'linear-gradient(90deg, #0d9488, #059669)',
    bgClass: 'bg-teal-50 dark:bg-teal-500/10',
    features: [
      'CRM projets intégré (Kanban)',
      'Blog IA avec covers auto-générées',
      'Suivi FinOps coûts IA en temps réel',
      'Marketplace de modules activables',
    ],
  },
]
</script>
