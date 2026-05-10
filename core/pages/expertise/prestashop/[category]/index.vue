<script setup lang="ts">
/**
 */

interface ExpertiseArticle {
  title: string
  slug: string
  metaDescription: string
  category: string
  tags: string[]
  difficulty: string
  psVersions: string[]
  tldr: string
  faqCount: number
  generatedAt: string
  url: string
}

const route    = useRoute()
const category = route.params.category as string

const CATEGORY_META: Record<string, { label: string; icon: string; color: string; tagBg: string; desc: string }> = {
  developpement: { label: 'Développement', icon: '💻', color: 'text-indigo-700 dark:text-indigo-300', tagBg: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300', desc: 'Modules, hooks, overrides, Symfony, API' },
  configuration: { label: 'Configuration', icon: '⚙️', color: 'text-blue-700 dark:text-blue-300', tagBg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300', desc: 'Installation, paramétrage, back-office' },
  performance:   { label: 'Performance', icon: '⚡', color: 'text-amber-700 dark:text-amber-300', tagBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300', desc: 'Vitesse, cache, optimisation SQL, Core Web Vitals' },
  seo:           { label: 'SEO', icon: '🔍', color: 'text-teal-700 dark:text-teal-300', tagBg: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300', desc: 'Référencement, meta, sitemap, données structurées' },
  design:        { label: 'Design & Thèmes', icon: '🎨', color: 'text-pink-700 dark:text-pink-300', tagBg: 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300', desc: 'Thèmes, CSS, responsive, templates Smarty/Twig' },
  catalogue:     { label: 'Catalogue', icon: '📦', color: 'text-emerald-700 dark:text-emerald-300', tagBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', desc: 'Produits, catégories, attributs, import/export' },
  commandes:     { label: 'Commandes', icon: '🛒', color: 'text-orange-700 dark:text-orange-300', tagBg: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300', desc: 'Panier, checkout, factures, statuts' },
  securite:      { label: 'Sécurité', icon: '🔒', color: 'text-red-700 dark:text-red-300', tagBg: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300', desc: 'SSL, permissions, failles, mises à jour' },
  migration:     { label: 'Migration', icon: '🔄', color: 'text-violet-700 dark:text-violet-300', tagBg: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300', desc: 'Upgrade de version, migration serveur' },
  debug:         { label: 'Debug', icon: '🐛', color: 'text-rose-700 dark:text-rose-300', tagBg: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300', desc: 'Erreurs, logs, profiling, résolution' },
  livraison:     { label: 'Livraison', icon: '🚚', color: 'text-cyan-700 dark:text-cyan-300', tagBg: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300', desc: 'Transporteurs, Mondial Relay, Colissimo' },
  paiement:      { label: 'Paiement', icon: '💳', color: 'text-lime-700 dark:text-lime-300', tagBg: 'bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-300', desc: 'Modules paiement, Stripe, PayPal' },
  email:         { label: 'E-mails', icon: '📧', color: 'text-sky-700 dark:text-sky-300', tagBg: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300', desc: 'Templates, SMTP, notifications' },
  api:           { label: 'API & Webservice', icon: '🔌', color: 'text-fuchsia-700 dark:text-fuchsia-300', tagBg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300', desc: 'REST API, webservices, intégrations' },
  multiboutique: { label: 'Multi-boutique', icon: '🏪', color: 'text-yellow-700 dark:text-yellow-300', tagBg: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300', desc: 'Configuration multi-shop, id_shop' },
  general:       { label: 'Général', icon: '📄', color: 'text-gray-700 dark:text-gray-300', tagBg: 'bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-300', desc: 'Conseils généraux et bonnes pratiques' },
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  debutant:      { label: 'Débutant', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300' },
  intermediaire: { label: 'Intermédiaire', color: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300' },
  avance:        { label: 'Avancé', color: 'text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-300' },
}

const catMeta = CATEGORY_META[category] || { label: category, icon: '📄', color: 'text-gray-700', tagBg: 'bg-gray-100 text-gray-700', desc: '' }

const { data: articles, status } = await useFetch<ExpertiseArticle[]>('/api/expertise', { query: { category } })

useHead({
  title: `${catMeta.label} PrestaShop — Expertise CodeMyShop`,
  meta: [{ name: 'description', content: `Articles techniques PrestaShop sur ${catMeta.label.toLowerCase()} : ${catMeta.desc}. Solutions concrètes par CodeMyShop.` }],
})
</script>

<template>
  <div class="py-12">
    <header class="mb-14">
      <nav aria-label="Fil d'Ariane" class="text-sm text-gray-600 dark:text-slate-400 mb-6 flex items-center gap-2">
        <NuxtLink to="/" class="hover:text-primary-600 transition-colors">Accueil</NuxtLink>
        <span aria-hidden="true">/</span>
        <NuxtLink to="/expertise" class="hover:text-primary-600 transition-colors">Expertise</NuxtLink>
        <span aria-hidden="true">/</span>
        <span>{{ catMeta.label }}</span>
      </nav>

      <div class="flex items-start gap-4 mb-8">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" :class="catMeta.tagBg">
          {{ catMeta.icon }}
        </div>
        <div>
          <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-2">{{ catMeta.label }}</h1>
          <p class="text-lg text-gray-500 dark:text-slate-400">{{ catMeta.desc }}</p>
          <p v-if="articles" class="text-sm text-gray-500 dark:text-slate-500 mt-2">{{ articles.length }} article{{ articles.length > 1 ? 's' : '' }}</p>
        </div>
      </div>
    </header>

    <div v-if="status === 'pending'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="n in 6" :key="n" class="animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
        <div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
        <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-full mb-2" />
        <div class="h-3 bg-gray-100 dark:bg-slate-800 rounded w-2/3" />
      </div>
    </div>

    <div v-else-if="articles?.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <NuxtLink
        v-for="article in articles"
        :key="article.slug"
        :to="article.url"
        class="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-500/20 transition-all duration-300"
      >
        <div class="p-5">
          <div class="flex items-center gap-2 mb-3 flex-wrap">
            <span
              v-if="article.difficulty"
              class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              :class="DIFFICULTY_LABELS[article.difficulty]?.color || 'bg-gray-100 text-gray-700'"
            >
              {{ DIFFICULTY_LABELS[article.difficulty]?.label || article.difficulty }}
            </span>
            <span v-if="article.faqCount" class="text-[10px] font-semibold text-gray-700 dark:text-slate-300">{{ article.faqCount }} FAQ</span>
          </div>
          <h2 class="text-base font-bold text-gray-900 dark:text-white leading-snug mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
            {{ article.title }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-3 mb-3">
            {{ article.tldr || article.metaDescription }}
          </p>
          <div v-if="article.psVersions?.length" class="flex items-center gap-1.5 mb-3">
            <span v-for="v in article.psVersions" :key="v" class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">PS {{ v }}</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs font-semibold" :class="catMeta.color">
            <span class="group-hover:underline">Lire l'article</span>
            <svg class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-20 text-gray-500 dark:text-slate-500">
      <p class="text-5xl mb-4">{{ catMeta.icon }}</p>
      <p class="text-lg font-medium">Aucun article dans cette catégorie pour le moment.</p>
      <NuxtLink to="/expertise" class="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-4 inline-block">← Retour à l'expertise</NuxtLink>
    </div>
  </div>
</template>
