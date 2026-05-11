<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/categories" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div v-if="category" class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">{{ category.name || 'Catégorie sans nom' }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          #{{ category.id }} — profondeur {{ category.depth }} — {{ nbProducts }} produit{{ nbProducts > 1 ? 's' : '' }}
        </p>
      </div>
      <div v-else class="flex-1" />

      <div class="flex items-center gap-3">
        
        <HubLangSelector aria-label="Langue d'édition de la catégorie" />

        <label class="flex items-center gap-2 text-xs cursor-pointer" :class="{ 'opacity-40 cursor-not-allowed': !isMasterLang }" title="Affichée sur la boutique (éditable en langue master uniquement)">
          <span class="text-gray-500 dark:text-slate-400">Affichée</span>
          <span class="relative inline-block w-9 h-5">
            <input type="checkbox" v-model="form.active" :disabled="!isMasterLang" class="peer sr-only" />
            <span class="absolute inset-0 bg-gray-200 dark:bg-slate-700 rounded-full peer-checked:bg-primary-600 transition-colors"></span>
            <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-4 transition-transform"></span>
          </span>
        </label>

        <span v-if="saved" class="text-xs text-green-600 font-medium">Sauvegardé</span>
        <span v-if="saveError" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="saveError">{{ saveError }}</span>

        <a
          v-if="category"
          :href="categoryFrontUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
          title="Ouvrir la catégorie sur le site public"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          <span>Voir</span>
        </a>
        <button
          @click="save"
          :disabled="saving || loading"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
        >
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </header>

    
    <div v-if="loading" class="px-6 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 h-96 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="space-y-6">
          <div class="h-64 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>

    <div v-else-if="category" class="px-6 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm">
            <nav class="flex items-center gap-1 px-4 border-b border-gray-100 dark:border-slate-800" role="tablist">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                role="tab"
                :aria-selected="activeTab === tab.id"
                @click="activeTab = tab.id"
                :class="[
                  'relative text-xs px-4 py-3 -mb-px border-b-2 transition-colors font-medium',
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700 dark:text-primary-400 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-200 dark:hover:border-slate-700'
                ]"
              >
                {{ tab.label }}
              </button>
            </nav>
          </div>

          
          <div v-show="activeTab === 'essentiel'" class="space-y-6">
            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-5">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Identité</h2>
                <span class="text-[10px] uppercase tracking-wide text-gray-400">Général</span>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Nom</label>
                <input
                  v-model="form.name"
                  type="text"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-3">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Arborescence</h2>
                <span class="text-[10px] uppercase tracking-wide text-gray-400">Parent</span>
              </div>
              <HubCategoryTreeSelect
                v-model="form.parentId"
                :categories="parents"
                :exclude-id="category.id"
              />
            </div>
          </div>

          
          <div v-show="activeTab === 'contenu'" class="space-y-6">
            
            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Image de couverture</h2>
                  <p class="text-xs text-gray-400 mt-0.5">Format carré (col-4 du hero) — upload manuel ou génération automatique (Pexels / Unsplash).</p>
                </div>
                <button
                  @click="requestCatCover"
                  :disabled="catCoverGenerating || !form.name"
                  class="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5 shrink-0"
                >
                  <svg v-if="catCoverGenerating" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                  {{ catCoverGenerating ? 'En file…' : 'Générer' }}
                </button>
              </div>

              <div>
                <label for="cat-cover-keywords" class="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">
                  Mots-clés image (optionnel)
                </label>
                <input
                  id="cat-cover-keywords"
                  v-model="catCoverKeywords"
                  type="text"
                  maxlength="255"
                  placeholder="ex : olives kalamata greek market"
                  class="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                <p class="text-[10px] text-gray-400 mt-1">
                  Si rempli, ces mots-clés sont envoyés tels quels à Pexels/Unsplash (anglais recommandé). Vide = cascade auto sur le nom de la catégorie.
                </p>
              </div>

              <div class="mx-auto w-full max-w-sm">
                <div v-if="catCoverUrl || coverUrl" class="relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm bg-primary-50">
                  <img
                    :src="catCoverUrl || coverUrl"
                    :alt="form.name"
                    class="h-full w-full object-cover"
                    @error="coverFallbackLevel++"
                  />
                </div>
                <div v-else class="aspect-square w-full rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400">
                  <p class="text-xs">Aucune image</p>
                </div>
              </div>

              <input
                ref="coverFileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onCoverFileChange"
              />
              <button
                type="button"
                :disabled="coverUploading"
                @click="onUploadCover"
                class="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {{ coverUploading ? 'Envoi…' : "Remplacer l'image" }}
              </button>
              <p v-if="coverUploadError" class="text-xs text-rose-600 dark:text-rose-400">{{ coverUploadError }}</p>
              <p v-if="catCoverStatus" class="text-[10px]" :class="catCoverStatusClass">{{ catCoverStatus }}</p>
            </div>

            
            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-2">
              <div class="flex items-center gap-2">
                <label for="cat-h1" class="text-sm font-bold text-gray-800 dark:text-slate-100">H1</label>
                
                <div class="relative group inline-flex">
                  <svg class="w-4 h-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01" />
                  </svg>
                  <div class="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 absolute left-6 top-0 z-30 w-80 p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] leading-relaxed shadow-xl ring-1 ring-slate-700">
                    <p class="font-semibold mb-1.5 text-white">Le H1 est décisif pour le SEO.</p>
                    <p class="mb-1.5">Il oriente le mot-clé ciblé par toute la page et alimente la rédaction IA — il n'est <strong class="text-emerald-300">jamais</strong> généré automatiquement.</p>
                    <p>La section <strong class="text-emerald-300">Mots-clés ciblés (Search Console)</strong> ci-dessous liste les requêtes réelles qui mentionnent cette catégorie. Le top keyword (impressions × position) suggère le H1 optimal — clique « Appliquer comme H1 » pour l'utiliser.</p>
                  </div>
                </div>
              </div>
              <p class="text-xs text-gray-400">Titre principal affiché sur la page catégorie (distinct du nom navigation).</p>
              <input
                id="cat-h1"
                v-model="form.h1"
                type="text"
                maxlength="255"
                placeholder="Ex : Fruits secs en gros — sélection Rungis"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
              <p class="text-[10px] text-gray-400">{{ form.h1.length }}/255</p>
            </div>

            
            <section class="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-500/20 rounded-xl shadow-sm p-6">
              <button
                type="button"
                @click="seoExpanded = !seoExpanded"
                class="w-full flex items-center justify-between gap-3 text-left group"
                :class="seoExpanded ? 'mb-3' : ''"
              >
                <div class="flex-1 min-w-0">
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                    <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
                    Mots-clés ciblés (Search Console)
                    <span v-if="seoIsPillar" class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                      Page pilier · {{ seoChildren.length }} sous-cat.
                    </span>
                    <span v-if="!seoExpanded && (seoKeywords.length || seoSiloBuckets.length)" class="text-[10px] font-medium text-gray-400 normal-case tracking-normal">
                      {{ seoKeywords.length }} broad · {{ seoSiloBuckets.reduce((a, b) => a + b.keywords.length, 0) }} en silo
                    </span>
                  </h2>
                  <p v-if="seoExpanded" class="text-xs text-gray-400 mt-0.5">
                    <template v-if="seoIsPillar">
                      Cette catégorie a des enfants — seuls les mots-clés <strong>broad</strong> (transverses) sont gardés ici. Les requêtes spécifiques sont déléguées aux sous-catégories ci-dessous.
                    </template>
                    <template v-else>
                      Opportunités GSC qui mentionnent cette catégorie. Le top keyword pilote le H1 et la rédaction IA.
                    </template>
                  </p>
                  <p v-else-if="seoBest" class="text-xs text-gray-400 mt-0.5 truncate">
                    Top : <span class="font-semibold text-gray-600 dark:text-slate-300">{{ seoBest.query }}</span>
                    <span class="text-[10px]">· pos. {{ seoBest.position }} · {{ seoBest.impressions.toLocaleString('fr-FR') }} impr.</span>
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span
                    v-if="seoExpanded"
                    role="button"
                    @click.stop="loadSeoKeywords"
                    :class="seoLoading ? 'opacity-50 pointer-events-none' : ''"
                    class="text-[10px] px-2 py-1 rounded border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {{ seoLoading ? 'Chargement…' : 'Actualiser' }}
                  </span>
                  <svg
                    class="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform"
                    :class="seoExpanded ? 'rotate-180' : ''"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>
              <div v-if="seoExpanded">

              <div v-if="seoLoading" class="text-center py-4">
                <svg class="w-4 h-4 animate-spin mx-auto text-emerald-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              </div>
              <div v-else-if="seoError" class="text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded p-2">
                {{ seoError }} — <NuxtLink to="/hub/admin/features" class="underline">configurer GSC</NuxtLink>
              </div>
              <div v-else-if="!seoKeywords.length" class="text-xs text-gray-400 italic">
                Aucun mot-clé GSC ne mentionne « {{ form.name }} » sur les 28 derniers jours.
                Soit la catégorie est neuve, soit le sujet n'est pas encore indexé.
              </div>
              <div v-else>
                
                <div v-if="seoBest && seoRecommendedH1" class="mb-3 p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <p class="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">H1 recommandé (top GSC)</p>
                      <p class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ seoRecommendedH1 }}</p>
                      <p class="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                        Position {{ seoBest.position }} · {{ seoBest.impressions.toLocaleString('fr-FR') }} impressions · {{ seoBest.clicks }} clics · CTR {{ seoBest.ctr }}%
                      </p>
                    </div>
                    <button @click="applyH1FromSeo" class="text-[11px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold transition-colors shrink-0">
                      Appliquer comme H1
                    </button>
                  </div>
                </div>

                
                <div class="overflow-x-auto -mx-6">
                  <table class="w-full text-[11px]">
                    <thead class="text-[9px] uppercase tracking-wider text-gray-500 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800">
                      <tr>
                        <th class="px-6 py-1.5 text-left font-semibold">Mot-clé</th>
                        <th class="px-2 py-1.5 text-right font-semibold">Pos.</th>
                        <th class="px-2 py-1.5 text-right font-semibold">Impr.</th>
                        <th class="px-2 py-1.5 text-right font-semibold">Clics</th>
                        <th class="px-2 py-1.5 text-right font-semibold">CTR</th>
                        <th class="px-2 py-1.5 text-left font-semibold">Type</th>
                        <th class="px-6 py-1.5 text-right font-semibold w-20"></th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                      <tr v-for="(opp, i) in seoKeywords" :key="opp.query + opp.page" class="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                        <td class="px-6 py-1.5 font-medium text-gray-700 dark:text-slate-200">
                          <span :class="i === 0 ? 'font-bold' : ''">{{ opp.query }}</span>
                        </td>
                        <td class="px-2 py-1.5 text-right font-mono">{{ opp.position }}</td>
                        <td class="px-2 py-1.5 text-right font-mono">{{ opp.impressions.toLocaleString('fr-FR') }}</td>
                        <td class="px-2 py-1.5 text-right font-mono">{{ opp.clicks }}</td>
                        <td class="px-2 py-1.5 text-right font-mono">{{ opp.ctr }}%</td>
                        <td class="px-2 py-1.5">
                          <span class="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
                            :class="{
                              'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400': opp.type === 'conquest',
                              'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400': opp.type === 'rewrite',
                              'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400': opp.type === 'defend',
                            }">
                            {{ opp.type }}
                          </span>
                        </td>
                        <td class="px-6 py-1.5 text-right">
                          <button @click="applyKeywordAsH1(opp)" class="text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline">→ H1</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p class="text-[10px] text-gray-400 mt-3">
                  Ces données seront automatiquement injectées dans le prompt « Rédaction IA » ci-dessous pour orienter le résumé et la description longue.
                </p>

                
                <div v-if="seoIsPillar && seoSiloBuckets.length" class="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <h3 class="text-xs font-bold text-gray-700 dark:text-slate-200 mb-2">
                    Distribution silo — {{ seoSiloBuckets.reduce((a, b) => a + b.keywords.length, 0) }} mots-clés à déléguer aux sous-catégories
                  </h3>
                  <p class="text-[10px] text-gray-400 mb-3">
                    Ces requêtes ciblent des thématiques spécifiques. Elles devraient être traitées par la sous-catégorie correspondante (cocon sémantique).
                  </p>
                  <div class="space-y-3">
                    <div v-for="bucket in seoSiloBuckets" :key="bucket.childId" class="rounded-lg border border-gray-100 dark:border-slate-800 overflow-hidden">
                      <div class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-800/50">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-semibold text-gray-800 dark:text-slate-200">{{ bucket.child.name }}</span>
                          <span class="text-[10px] text-gray-400">{{ bucket.keywords.length }} mot{{ bucket.keywords.length > 1 ? 's' : '' }}-clé</span>
                        </div>
                        <NuxtLink :to="`/hub/categories/${bucket.childId}`" class="text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline">
                          Éditer →
                        </NuxtLink>
                      </div>
                      <ul class="divide-y divide-gray-100 dark:divide-slate-800">
                        <li v-for="kw in bucket.keywords" :key="kw.query" class="px-3 py-1.5 flex items-center justify-between text-[11px]">
                          <span class="font-medium text-gray-700 dark:text-slate-300">{{ kw.query }}</span>
                          <span class="font-mono text-gray-400">pos. {{ kw.position }} · {{ kw.impressions }} impr · CTR {{ kw.ctr }}%</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </section>

            
            <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Rédaction IA</h2>
                  <p class="text-xs text-gray-400 mt-0.5">Résumé + description longue.{{ aiMode === 'centaure' ? ' Copier le prompt, coller dans votre LLM, coller la réponse.' : ' Génération automatique via API (file d\'attente).' }}</p>
                </div>
                <div class="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    @click="aiMode = 'centaure'"
                    :class="['text-xs px-3 py-1.5 rounded-md font-medium transition-colors', aiMode === 'centaure' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                  >Centaure</button>
                  <button
                    @click="aiMode = 'api'"
                    :class="['text-xs px-3 py-1.5 rounded-md font-medium transition-colors', aiMode === 'api' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                  >API</button>
                </div>
              </div>

              <div class="mt-3">
                <input
                  v-model="catInstructions"
                  type="text"
                  placeholder="Consignes (optionnel) : angle, ton, cible…"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>

              
              <div v-if="aiMode === 'centaure'" class="mt-4 space-y-3">
                <button
                  @click="generateCentaurePrompt"
                  :disabled="!form.name"
                  class="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium"
                >
                  Générer le prompt
                </button>

                <div v-if="centaurePrompt" class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-medium text-gray-600 dark:text-slate-300">Prompt (copier dans Claude, Gemini ou ChatGPT)</span>
                    <button @click="copyCentaurePrompt" class="text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors" :class="centaurePromptCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 hover:bg-gray-200'">
                      {{ centaurePromptCopied ? 'Copié !' : 'Copier' }}
                    </button>
                  </div>
                  <textarea
                    :value="centaurePrompt"
                    readonly
                    rows="6"
                    class="w-full text-[11px] font-mono bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none cursor-text select-all"
                    @focus="($event.target as HTMLTextAreaElement).select()"
                  />
                </div>

                <div v-if="centaurePrompt" class="space-y-2">
                  <span class="text-[11px] font-medium text-gray-600 dark:text-slate-300">Réponse du LLM (coller ici)</span>
                  <textarea
                    v-model="centaureResponse"
                    rows="8"
                    placeholder='Collez la réponse JSON du LLM ici : { "summary": "...", "description": "..." }'
                    class="w-full text-[11px] font-mono bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                  <button
                    v-if="centaureResponse.trim()"
                    @click="applyCentaureResponse"
                    class="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    Appliquer Résumé + Description
                  </button>
                  <p v-if="catRedactionStatus" class="text-[10px]" :class="catRedactionStatusClass">{{ catRedactionStatus }}</p>
                </div>
              </div>

              
              <div v-if="aiMode === 'api'" class="mt-4 space-y-3">
                <button
                  @click="requestCatContent"
                  :disabled="catRedactionGenerating || !form.name"
                  class="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5"
                >
                  <svg v-if="catRedactionGenerating" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {{ catRedactionGenerating ? 'En cours…' : 'Lancer la rédaction' }}
                </button>
                <p v-if="catRedactionStatus" class="text-[10px]" :class="catRedactionStatusClass">{{ catRedactionStatus }}</p>

                <div v-if="catRedactionResult" class="space-y-3">
                  <div class="border border-violet-200 dark:border-violet-800 rounded-lg p-3 bg-violet-50/50 dark:bg-violet-950/20 space-y-2">
                    <p class="text-[10px] font-semibold uppercase tracking-widest text-violet-600">Proposition IA</p>
                    <div v-if="catRedactionResult.short_description">
                      <span class="text-[10px] text-gray-500">Résumé (haut) :</span>
                      <div class="text-xs text-gray-600 prose prose-sm" v-html="catRedactionResult.short_description" />
                    </div>
                    <div v-if="catRedactionResult.long_description">
                      <span class="text-[10px] text-gray-500">Description longue (bas) :</span>
                      <div class="text-xs text-gray-600 prose prose-sm max-h-40 overflow-auto" v-html="catRedactionResult.long_description" />
                    </div>
                  </div>
                  <button @click="applyCatRedaction" class="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium">Appliquer Résumé + Description</button>
                </div>
              </div>
            </section>

            
            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-2">
              <label for="cat-summary" class="text-sm font-bold text-gray-800 dark:text-slate-100">Résumé</label>
              <p class="text-xs text-gray-400">Texte court affiché à côté de la cover en haut de page.</p>
              <textarea
                id="cat-summary"
                v-model="form.summary"
                rows="5"
                placeholder="2–3 phrases qui posent la catégorie."
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
              <p class="text-[10px] text-gray-400">{{ form.summary.length }} caractères.</p>
            </div>

            
            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-5">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Description longue</h2>
                  <p class="text-xs text-gray-400">Texte SEO affiché en bas de page catégorie.</p>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    v-for="tool in toolbar"
                    :key="tool.cmd + (tool.value ?? '')"
                    type="button"
                    @mousedown.prevent="exec(tool.cmd, tool.value)"
                    :title="tool.label"
                    class="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 font-mono border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors"
                  >
                    {{ tool.icon }}
                  </button>
                  <button
                    type="button"
                    @mousedown.prevent="promptLink"
                    title="Lien"
                    class="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 font-mono border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors"
                  >🔗</button>
                  <span class="mx-1 h-4 w-px bg-gray-200 dark:bg-slate-700" />
                  <button
                    type="button"
                    @click="mode = mode === 'wysiwyg' ? 'html' : 'wysiwyg'"
                    :class="mode === 'html' ? 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950/40 dark:text-primary-300 dark:border-primary-800' : 'text-gray-600 dark:text-slate-300 border-transparent hover:border-gray-200 dark:hover:border-slate-700'"
                    class="text-[10px] uppercase tracking-wide px-2 py-1 rounded border hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >{{ mode === 'html' ? 'HTML' : 'RICH' }}</button>
                </div>
              </div>

              <div
                v-if="mode === 'wysiwyg'"
                ref="editorEl"
                contenteditable="true"
                class="min-h-[260px] w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/40 prose prose-sm dark:prose-invert max-w-none overflow-auto"
                @input="onEditorInput"
                @blur="onEditorInput"
              />
              <textarea
                v-else
                v-model="form.description"
                rows="14"
                placeholder="<p>Description HTML…</p>"
                class="w-full text-xs font-mono border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 rounded-lg px-3 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
              <p class="text-[10px] text-gray-400">{{ plainTextLength }} caractères.</p>
            </div>
          </div>

          
          <div v-show="activeTab === 'faq'" class="space-y-6">

            
            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Génération FAQ par IA</h2>
                  <p class="text-xs text-gray-400 mt-0.5">Copier le prompt, coller dans votre LLM, coller la réponse JSON.</p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="generateFaqCentaurePrompt"
                    :disabled="!form.name"
                    class="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors font-medium"
                  >
                    Générer le prompt
                  </button>
                  <button
                    v-if="faqCentaurePrompt"
                    @click="copyFaqCentaurePrompt"
                    class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
                  >
                    {{ faqCentaurePromptCopied ? 'Copié !' : 'Copier' }}
                  </button>
                </div>
              </div>

              <div v-if="faqCentaurePrompt" class="space-y-3">
                <textarea
                  :value="faqCentaurePrompt"
                  readonly
                  rows="5"
                  class="w-full text-[11px] font-mono bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none cursor-text select-all"
                  @focus="($event.target as HTMLTextAreaElement).select()"
                />
                <div class="space-y-2">
                  <span class="text-[11px] font-medium text-gray-600 dark:text-slate-300">Réponse du LLM (coller ici)</span>
                  <textarea
                    v-model="faqCentaureResponse"
                    rows="6"
                    placeholder='{ "faqs": [ { "q": "Question ?", "a": "Réponse." } ] }'
                    class="w-full text-[11px] font-mono bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                  <button
                    v-if="faqCentaureResponse.trim()"
                    @click="applyFaqCentaureResponse"
                    class="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    Appliquer les FAQ
                  </button>
                </div>
              </div>
              <p v-else-if="!form.name" class="text-xs text-gray-400">Enregistrez d'abord un nom de catégorie.</p>
              <p v-if="catRedactionStatus && !faqCentaurePrompt" class="text-[10px]" :class="catRedactionStatusClass">{{ catRedactionStatus }}</p>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
              <HubCategoryFaqRepeater v-model="form.faqs" />
            </div>
          </div>

          
          <div v-show="activeTab === 'maillage'" class="space-y-6">
            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
              <HubCategoryBlogPostLinker v-model="form.linkedPosts" />
            </div>
            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
              <HubCategoryCrossLinker :host-id="Number($route.params.id)" />
            </div>
          </div>

          
          <div v-show="activeTab === 'seo'" class="space-y-6">
            
            <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Optimisation SEO par IA</h2>
                  <p class="text-xs text-gray-400 mt-0.5">Optimise meta_title, meta_description et slug pour maximiser le CTR.</p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click="generateSeoPrompt"
                  :disabled="!form.name"
                  class="text-xs px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors font-medium"
                >
                  Générer le prompt
                </button>
                <button
                  v-if="seoPrompt"
                  @click="copySeoPrompt"
                  class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  {{ seoPromptCopied ? 'Copié !' : 'Copier' }}
                </button>
              </div>

              <div v-if="seoPrompt" class="space-y-3">
                <textarea
                  :value="seoPrompt"
                  readonly
                  rows="6"
                  class="w-full text-[11px] font-mono bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none cursor-text select-all"
                  @focus="($event.target as HTMLTextAreaElement).select()"
                />
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Coller la réponse IA</label>
                  <textarea
                    v-model="seoResponse"
                    rows="6"
                    placeholder='{ "meta_title": "...", "meta_description": "...", "slug": "mon-slug" }'
                    class="w-full text-[11px] font-mono bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <button
                  @click="applySeoResponse"
                  :disabled="!seoResponse"
                  class="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors font-medium"
                >
                  Appliquer les optimisations SEO
                </button>
              </div>
              <p v-if="seoApplyStatus" class="text-[10px]" :class="seoApplyStatusClass">{{ seoApplyStatus }}</p>
            </section>

            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-5">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Référencement</h2>
                  <p class="text-[11px] text-gray-400 mt-0.5">Meta title, meta description, slug. Preview Google en direct.</p>
                </div>
                <span class="text-[10px] uppercase tracking-wide text-gray-400">SEO</span>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-medium text-gray-500">Meta title</label>
                  <span class="text-[10px] font-mono" :class="titleCounterClass">{{ titleLength }} / 60</span>
                </div>
                <input
                  v-model="form.metaTitle"
                  type="text"
                  :placeholder="form.name || 'Titre affiché dans Google'"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-medium text-gray-500">Meta description</label>
                  <span class="text-[10px] font-mono" :class="descCounterClass">{{ descLength }} / 160</span>
                </div>
                <textarea
                  v-model="form.metaDescription"
                  rows="3"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">URL réécrite (link rewrite)</label>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-gray-400 font-mono select-none">/</span>
                  <input
                    v-model="form.slug"
                    type="text"
                    placeholder="ma-categorie"
                    @input="sanitizeSlug"
                    class="flex-1 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                  <button
                    type="button"
                    @click="regenerateSlug"
                    class="text-[10px] uppercase tracking-wide px-2 py-2 rounded border border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >Régénérer</button>
                </div>
                <p class="text-[10px] text-gray-400 mt-1">Minuscules, tirets, pas d'accent ni d'espace.</p>
              </div>

              <div class="pt-4 border-t border-gray-100 dark:border-slate-800">
                <p class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-3">Aperçu Google</p>
                <div class="bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg p-4 font-sans">
                  <div class="flex items-center gap-2 mb-1">
                    <div class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 flex items-center justify-center text-white text-[10px] font-bold">G</div>
                    <div class="flex flex-col">
                      <span class="text-xs text-gray-600 dark:text-slate-300 leading-tight">{{ siteName }}</span>
                      <span class="text-[10px] text-gray-400 leading-tight truncate max-w-md">{{ previewUrl }}</span>
                    </div>
                  </div>
                  <h3 class="text-lg text-[#1a0dab] dark:text-blue-400 font-normal leading-snug cursor-pointer hover:underline">
                    {{ previewTitle }}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-slate-400 leading-snug mt-1 line-clamp-2">
                    {{ previewDescription }}
                  </p>
                </div>
                <p class="text-[10px] text-gray-400 mt-2">
                  <span v-if="titleLength > 60" class="text-amber-600">⚠ Meta title &gt; 60 caractères, Google tronquera.</span>
                  <span v-else-if="descLength > 160" class="text-amber-600">⚠ Meta description &gt; 160 caractères, Google tronquera.</span>
                  <span v-else class="text-emerald-600">✓ Longueurs conformes aux recommandations Google.</span>
                </p>
              </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Accès des groupes</h2>
                  <p class="text-[11px] text-gray-400 mt-0.5">Groupes clients autorisés à voir cette catégorie.</p>
                </div>
                <span class="text-[10px] uppercase tracking-wide text-gray-400">ps_category_group</span>
              </div>
              <div v-if="groups.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="g in groups"
                  :key="g.id"
                  class="flex items-center gap-2 text-sm px-3 py-2 border border-gray-100 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :value="g.id"
                    v-model="form.groupIds"
                    class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span class="text-gray-800 dark:text-slate-100">{{ g.name }}</span>
                  <span class="text-[10px] text-gray-400 font-mono ml-auto">#{{ g.id }}</span>
                </label>
              </div>
              <p v-else class="text-xs text-gray-400">Aucun groupe configuré.</p>
            </div>
          </div>
        </div>

        
        <div class="space-y-6">
          <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">État</h2>
              <span class="text-[10px] uppercase tracking-wide text-gray-400">Status</span>
            </div>
            <label class="flex items-center gap-3 text-sm cursor-pointer">
              <input type="checkbox" v-model="form.active" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span class="text-gray-800 dark:text-slate-100">Catégorie visible</span>
            </label>
            <div class="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-100 dark:border-slate-800">
              <div class="flex items-center justify-between"><span>Profondeur</span><span class="font-mono text-gray-700 dark:text-slate-200">{{ category.depth }}</span></div>
              <div class="flex items-center justify-between"><span>Produits</span><span class="font-mono text-gray-700 dark:text-slate-200">{{ nbProducts }}</span></div>
              <div class="flex items-center justify-between"><span>Parent</span><span class="font-mono text-gray-700 dark:text-slate-200">#{{ form.parentId }}</span></div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-3">Raccourcis</h2>
            <div class="space-y-2">
              <NuxtLink
                :to="`/hub/products?category=${category.id}`"
                class="block text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Voir les produits ({{ nbProducts }})
              </NuxtLink>
              <NuxtLink
                to="/hub/categories"
                class="block text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Retour à la liste
              </NuxtLink>
              <button
                type="button"
                @click="showDeleteModal = true"
                class="w-full text-left text-xs px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79" /></svg>
                Supprimer la catégorie
              </button>
            </div>
          </div>

          
          <Teleport to="body">
            <div v-if="showDeleteModal" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" @click.self="showDeleteModal = false">
              <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <h3 class="text-base font-bold text-gray-900 dark:text-white">Supprimer « {{ category?.name || `#${category?.id}` }} »</h3>
                <p class="text-xs text-gray-500 dark:text-slate-400">
                  Cette catégorie contient <strong>{{ nbProducts }}</strong> produit{{ nbProducts > 1 ? 's' : '' }}. Choisis comment les traiter.
                </p>

                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Migrer les produits vers</label>
                  <select v-model.number="deleteTargetId" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800">
                    <option :value="0">— Ne pas migrer (les produits perdent cette cat) —</option>
                    <option v-for="c in deleteTargetOptions" :key="c.id" :value="c.id">
                      {{ '— '.repeat(Math.max(0, c.depth - 2)) }}{{ c.name }} (#{{ c.id }})
                    </option>
                  </select>
                </div>

                <label class="flex items-start gap-2 text-xs cursor-pointer">
                  <input v-model="deleteHard" type="checkbox" class="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                  <span class="text-gray-700 dark:text-slate-300">
                    <strong>Suppression définitive</strong> — supprime aussi la cat de la base. Sinon, elle est juste désactivée (récupérable).
                  </span>
                </label>

                <div v-if="deleteError" class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">{{ deleteError }}</div>

                <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <button @click="showDeleteModal = false" class="text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Annuler</button>
                  <button @click="confirmDelete" :disabled="deleteLoading" class="text-xs px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 transition-colors">
                    {{ deleteLoading ? 'Suppression…' : (deleteHard ? 'Supprimer définitivement' : 'Désactiver') }}
                  </button>
                </div>
              </div>
            </div>
          </Teleport>
        </div>
      </div>
    </div>

    <div v-else class="px-6 py-16 text-center">
      <p class="text-sm text-gray-500">Catégorie introuvable.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

import type { CategoryFaq, LinkedBlogPost } from '~/types/hub/category-silo'

const route = useRoute()
const config = useRuntimeConfig()

const { currentLangId, isDefault: isMasterLang } = useHubLang()

const category = ref<any>(null)
const parents = ref<any[]>([])
const groups = ref<Array<{ id: number; name: string }>>([])
const nbProducts = ref(0)
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)

const showDeleteModal = ref(false)
const deleteTargetId = ref(0)
const deleteHard = ref(false)
const deleteError = ref<string | null>(null)
const deleteLoading = ref(false)
const deleteTargetOptions = computed<Array<{ id: number; name: string; depth: number }>>(() => {
  const me = category.value?.id
  return parents.value
    .filter(p => p.id !== me && p.id > 1)
    .map(p => ({ id: p.id, name: p.name || `#${p.id}`, depth: p.depth || p.level_depth || 2 }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

async function confirmDelete() {
  const id = category.value?.id
  if (!id) return
  deleteError.value = null
  deleteLoading.value = true
  try {
    const res = await $fetch<{ ok: boolean; migrated_products: number; removed_associations: number; deleted: boolean }>(
      `/api/bo/categories/${id}/delete-and-merge`,
      {
        method: 'POST',
        body: {
          target_category_id: deleteTargetId.value || null,
          hard_delete: deleteHard.value,
        },
      },
    )
    showDeleteModal.value = false
    
    await navigateTo('/hub/categories')
  } catch (err: any) {
    deleteError.value = err?.data?.message || err?.message || 'Erreur suppression'
  } finally {
    deleteLoading.value = false
  }
}

const coverFallbackLevel = ref(0)
const coverUploading = ref(false)
const coverUploadError = ref<string | null>(null)
const coverCacheBust = ref(0)
const coverFileInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  name: '',
  slug: '',
  h1: '',
  summary: '',
  description: '',
  parentId: 2,
  active: true,
  metaTitle: '',
  metaDescription: '',
  groupIds: [] as number[],
  faqs: [] as CategoryFaq[],
  linkedPosts: [] as LinkedBlogPost[],
})

type CategoryTab = 'essentiel' | 'contenu' | 'faq' | 'maillage' | 'seo'
const activeTab = ref<CategoryTab>('essentiel')
const tabs: Array<{ id: CategoryTab; label: string }> = [
  { id: 'essentiel', label: 'Essentiel' },
  { id: 'contenu', label: 'Contenu' },
  { id: 'faq', label: 'FAQ' },
  { id: 'maillage', label: 'Maillage' },
  { id: 'seo', label: 'SEO & Accès' },
]

const mode = ref<'wysiwyg' | 'html'>('wysiwyg')
const editorEl = ref<HTMLElement | null>(null)
const toolbar = [
  { cmd: 'bold', label: 'Gras', icon: 'B' },
  { cmd: 'italic', label: 'Italique', icon: 'I' },
  { cmd: 'formatBlock', value: 'H2', label: 'Titre H2', icon: 'H2' },
  { cmd: 'insertUnorderedList', label: 'Liste à puces', icon: '•' },
  { cmd: 'removeFormat', label: 'Effacer format', icon: '⟲' },
]
function exec(cmd: string, value?: string) {
  if (typeof document === 'undefined') return
  editorEl.value?.focus()
  document.execCommand(cmd, false, value)
  onEditorInput()
}
function promptLink() {
  if (typeof document === 'undefined') return
  const url = window.prompt('URL du lien', 'https://')
  if (!url) return
  editorEl.value?.focus()
  document.execCommand('createLink', false, url)
  onEditorInput()
}
function onEditorInput() {
  if (!editorEl.value) return
  form.description = editorEl.value.innerHTML
}
const plainTextLength = computed(() => {
  if (typeof document === 'undefined') return (form.description || '').length
  const tmp = document.createElement('div')
  tmp.innerHTML = form.description || ''
  return (tmp.textContent || '').trim().length
})
watch(
  () => form.description,
  (html) => {
    if (mode.value !== 'wysiwyg' || !editorEl.value) return
    if (editorEl.value.innerHTML !== (html || '')) editorEl.value.innerHTML = html || ''
  },
)
watch(mode, (m) => {
  nextTick(() => {
    if (m === 'wysiwyg' && editorEl.value) editorEl.value.innerHTML = form.description || ''
  })
})

const siteName = computed(() => {
  const host = String(config.public.psFrontUrl || '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return host || 'www.example-shop.com'
})
const previewUrl = computed(() => `${siteName.value} › ${form.slug || 'categorie'}`)
const previewTitle = computed(() => {
  const t = (form.metaTitle || '').trim() || (form.name || '').trim() || 'Titre catégorie'
  return t.length > 60 ? t.slice(0, 60) + '…' : t
})
const previewDescription = computed(() => {
  const d = (form.metaDescription || '').trim() || stripHtml(form.description || '').trim() || 'Aucune description.'
  return d.length > 160 ? d.slice(0, 160) + '…' : d
})
const titleLength = computed(() => (form.metaTitle || '').length)
const descLength = computed(() => (form.metaDescription || '').length)
const titleCounterClass = computed(() => {
  const l = titleLength.value
  if (l === 0) return 'text-gray-400'
  if (l > 60) return 'text-red-600'
  if (l > 50) return 'text-amber-600'
  return 'text-emerald-600'
})
const descCounterClass = computed(() => {
  const l = descLength.value
  if (l === 0) return 'text-gray-400'
  if (l > 160) return 'text-red-600'
  if (l > 140) return 'text-amber-600'
  return 'text-emerald-600'
})
function stripHtml(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '')
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}
function slugify(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}
function sanitizeSlug() {
  const cleaned = (form.slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
  if (cleaned !== form.slug) form.slug = cleaned
}
function regenerateSlug() {
  form.slug = slugify(form.name)
}

const categoryFrontUrl = computed(() => {
  
  
  
  const srv = category.value?.frontPath
  if (srv) return srv
  const id = category.value?.id ?? route.params.id
  const slug = form.slug || category.value?.slug || ''
  return slug ? `/c/${id}-${slug}` : `/c/${id}`
})

function slugifyLocal(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'category'
}
const coverUrl = computed(() => {
  const id = category.value?.id
  if (!id) return ''
  const bust = coverCacheBust.value ? `?v=${coverCacheBust.value}` : ''
  const slug = slugifyLocal(form.slug || category.value?.slug || '')
  
  if (coverFallbackLevel.value === 0) return `/img/c/${id}-${slug}-800.webp${bust}`
  if (coverFallbackLevel.value === 1) return `/img/c/${id}.jpg${bust}`
  if (coverFallbackLevel.value === 2 && (category.value as any)?.legacyCoverUrl) {
    return String((category.value as any).legacyCoverUrl)
  }
  return ''
})
function onUploadCover() {
  coverUploadError.value = null
  coverFileInput.value?.click()
}
async function uploadCategoryImage(file: File) {
  const id = category.value?.id ?? route.params.id
  if (!id) return

  if (!file.type.startsWith('image/')) {
    coverUploadError.value = 'Format non supporté (image uniquement)'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    coverUploadError.value = 'Fichier trop lourd (max 10 Mo)'
    return
  }

  coverUploading.value = true
  coverUploadError.value = null
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch(`/api/bo/categories/${id}/upload-cover`, {
      method: 'POST',
      query: { variant: 'cover' },
      body: fd,
    })
    coverCacheBust.value = Date.now()
    coverFallbackLevel.value = 0
  } catch (err: any) {
    coverUploadError.value = err?.data?.message || err?.message || 'Upload échoué'
  } finally {
    coverUploading.value = false
  }
}
function onCoverFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) uploadCategoryImage(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function load() {
  loading.value = true
  coverFallbackLevel.value = 0
  try {
    const data: any = await $fetch(`/api/bo/categories/${route.params.id}`, {
      query: { lang: currentLangId.value },
    })
    category.value = data.category
    parents.value = data.parents ?? []
    groups.value = data.groups ?? []
    nbProducts.value = data.nbProducts ?? 0
    
    
    
    catCoverUrl.value = null

    const c = data.category
    form.name = c.name || ''
    form.slug = c.slug || ''
    form.h1 = c.h1 || ''
    form.summary = c.summary || ''
    form.description = c.description || ''
    form.parentId = Number(c.parentId) || 2
    form.active = !!c.active
    form.metaTitle = c.metaTitle || ''
    form.metaDescription = c.metaDescription || ''
    form.groupIds = Array.isArray(data.groupIds) ? data.groupIds.map((n: any) => Number(n)) : []
    form.faqs = Array.isArray(data.faqs) ? data.faqs.map((f: any) => ({
      id: f.id,
      position: Number(f.position) || 0,
      active: !!f.active,
      question: f.question || '',
      answer: f.answer || '',
    })) : []
    form.linkedPosts = Array.isArray(data.linkedPosts) ? data.linkedPosts.map((p: any) => ({
      id: Number(p.id),
      position: Number(p.position) || 0,
      title: p.title || `#${p.id}`,
      slug: p.slug || '',
      datePublished: p.datePublished || null,
      cover: p.cover || null,
    })) : []

    nextTick(() => {
      if (editorEl.value && mode.value === 'wysiwyg') {
        editorEl.value.innerHTML = form.description || ''
      }
    })
  } catch (err: any) {
    console.error('Load category error:', err)
    category.value = null
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = null
  try {
    await $fetch(`/api/bo/categories/${route.params.id}`, {
      method: 'PUT',
      query: { lang: currentLangId.value },
      body: {
        name: form.name,
        parentId: form.parentId,
        active: form.active,
        h1: form.h1,
        summary: form.summary,
        description: form.description,
        slug: form.slug,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        groupIds: form.groupIds,
        faqs: form.faqs.map((f, i) => ({
          id: f.id,
          position: i,
          active: f.active,
          question: f.question,
          answer: f.answer,
        })),
        linkedPostIds: form.linkedPosts.map((p) => p.id),
      },
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
    await load()
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Échec de la sauvegarde'
    setTimeout(() => { saveError.value = null }, 6000)
  } finally {
    saving.value = false
  }
}

const catCoverUrl = ref<string | null>(null)
const catCoverGenerating = ref(false)
const catCoverStatus = ref<string | null>(null)
const catCoverStatusClass = ref('text-gray-400')
const catCoverKeywords = ref('')

async function requestCatCover() {
  if (!form.name || !route.params.id) return
  catCoverGenerating.value = true
  catCoverStatus.value = 'Envoi…'
  try {
    const res = await $fetch<any>('/api/bo/categories/generate-cover', {
      method: 'POST',
      body: {
        id_category: Number(route.params.id),
        name: form.name,
        slug: form.slug,
        keywords: catCoverKeywords.value.trim() || undefined,
      },
    })
    catCoverStatus.value = res.message || 'En queue'
    catCoverStatusClass.value = 'text-amber-500'
    startCatCoverPoll()
  } catch (err: any) {
    catCoverGenerating.value = false
    catCoverStatus.value = err?.data?.message || 'Erreur'
    catCoverStatusClass.value = 'text-red-500'
  }
}

let catCoverPollTimer: ReturnType<typeof setInterval> | null = null
function startCatCoverPoll() {
  if (catCoverPollTimer) clearInterval(catCoverPollTimer)
  catCoverPollTimer = setInterval(checkCatCoverStatus, 15000)
}

async function checkCatCoverStatus() {
  try {
    const data = await $fetch<any>('/api/bo/categories/cover-status', { query: { id_category: route.params.id } })
    if (!data.found) return
    if (data.status === 'done' && data.cover_url) {
      catCoverUrl.value = data.cover_url
      catCoverGenerating.value = false
      catCoverStatus.value = 'Image générée'
      catCoverStatusClass.value = 'text-emerald-600'
      if (catCoverPollTimer) clearInterval(catCoverPollTimer)
    } else if (data.status === 'error') {
      catCoverGenerating.value = false
      catCoverStatus.value = `Erreur : ${data.error_msg || 'inconnue'}`
      catCoverStatusClass.value = 'text-red-500'
      if (catCoverPollTimer) clearInterval(catCoverPollTimer)
    }
  } catch {  }
}

interface SeoKeyword {
  query: string; page: string; position: number; clicks: number
  impressions: number; ctr: number; score: number
  type: 'conquest' | 'defend' | 'rewrite'
  matchScore: number; matchReason: string
  siloChild?: { id: number; name: string; slug: string }
}
interface SiloBucket {
  childId: number
  child: { id: number; name: string; slug: string }
  keywords: SeoKeyword[]
}
const seoIsPillar      = ref(false)
const seoPillarAncestor = ref<{ id: number; name: string; slug: string } | null>(null)
const seoSiblings      = ref<{ id: number; name: string; slug: string }[]>([])
const seoChildren      = ref<{ id: number; name: string; slug: string }[]>([])
const seoKeywords      = ref<SeoKeyword[]>([])         
const seoSiloBuckets   = ref<SiloBucket[]>([])         
const seoBest          = ref<SeoKeyword | null>(null)
const seoRecommendedH1 = ref<string | null>(null)
const seoLoading       = ref(false)
const seoError         = ref<string | null>(null)
const seoExpanded      = ref(false)   

const tenantAudience = ref('')

async function loadTenantBrief() {
  try {
    const data = await $fetch<{ audience: string }>('/api/hub/tenant-brief')
    tenantAudience.value = (data?.audience ?? '').trim()
  } catch {
    tenantAudience.value = ''
  }
}

function audienceBlock(): string {
  const a = tenantAudience.value.trim()
  if (!a) return ''
  return `\n## Audience cible (impératif — non-négociable)\n${a}\n\nTout contenu généré doit respecter strictement cette cible. Si une donnée GSC ou un keyword paraît hors-cible (ex: requête "particulier" / "pas cher" / "pour la maison" sur un site B2B exclusif pro), ignore-la dans le rendu — ne forge pas de texte qui s'adresse à une audience exclue.\n`
}

async function loadSeoKeywords() {
  if (!route.params.id) return
  seoLoading.value = true
  seoError.value   = null
  try {
    const data = await $fetch<{
      isPillar: boolean
      pillarAncestor: { id: number; name: string; slug: string } | null
      siblings: { id: number; name: string; slug: string }[]
      children: { id: number; name: string; slug: string }[]
      pillarKeywords: SeoKeyword[]
      siloKeywords: SiloBucket[]
      bestKeyword: SeoKeyword | null
      recommendedH1: string | null
      error?: string
    }>(`/api/bo/categories/${route.params.id}/seo-keywords`)
    seoIsPillar.value       = data.isPillar
    seoPillarAncestor.value = data.pillarAncestor
    seoSiblings.value       = data.siblings ?? []
    seoChildren.value       = data.children ?? []
    seoKeywords.value       = data.pillarKeywords ?? []
    seoSiloBuckets.value    = data.siloKeywords ?? []
    seoBest.value           = data.bestKeyword
    seoRecommendedH1.value  = data.recommendedH1
    if (data.error) seoError.value = data.error
  } catch (err: any) {
    seoError.value = err?.data?.message || err?.message || 'Erreur réseau'
  } finally {
    seoLoading.value = false
  }
}

function applyH1FromSeo() {
  if (!seoRecommendedH1.value) return
  form.h1 = seoRecommendedH1.value.slice(0, 255)
}

function applyKeywordAsH1(opp: SeoKeyword) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  form.h1 = cap(opp.query).slice(0, 255)
}

const catInstructions = ref('')
const catRedactionGenerating = ref(false)
const catRedactionStatus = ref<string | null>(null)
const catRedactionStatusClass = ref('text-gray-400')
const catRedactionResult = ref<{ short_description: string; long_description: string; meta_title: string; meta_description: string; faq_json: string; faq_count: number } | null>(null)

async function requestCatContent() {
  if (!form.name || !route.params.id) return
  catRedactionGenerating.value = true
  catRedactionStatus.value = 'Envoi…'
  catRedactionResult.value = null
  try {
    const res = await $fetch<any>('/api/bo/categories/generate-content', {
      method: 'POST',
      body: { id_category: Number(route.params.id), name: form.name, slug: form.slug, instructions: catInstructions.value || undefined },
    })
    catRedactionStatus.value = res.message || 'En queue'
    catRedactionStatusClass.value = 'text-violet-500'
    startCatRedactionPoll()
  } catch (err: any) {
    catRedactionGenerating.value = false
    catRedactionStatus.value = err?.data?.message || 'Erreur'
    catRedactionStatusClass.value = 'text-red-500'
  }
}

let catRedactionPollTimer: ReturnType<typeof setInterval> | null = null
function startCatRedactionPoll() {
  if (catRedactionPollTimer) clearInterval(catRedactionPollTimer)
  catRedactionPollTimer = setInterval(checkCatRedactionStatus, 20000)
}

async function checkCatRedactionStatus() {
  try {
    const data = await $fetch<any>('/api/bo/categories/content-status', { query: { id_category: route.params.id } })
    if (!data.found) return
    if (data.status === 'done' && data.short_description) {
      catRedactionGenerating.value = false
      catRedactionResult.value = {
        short_description: data.short_description || '',
        long_description: data.long_description || '',
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        faq_json: data.faq_json || '[]',
        faq_count: data.faq_count || 0,
      }
      catRedactionStatus.value = `Rédaction terminée — ${data.faq_count} FAQ`
      catRedactionStatusClass.value = 'text-emerald-600'
      if (catRedactionPollTimer) clearInterval(catRedactionPollTimer)
    } else if (data.status === 'error') {
      catRedactionGenerating.value = false
      catRedactionStatus.value = `Erreur : ${data.error_msg || 'inconnue'}`
      catRedactionStatusClass.value = 'text-red-500'
      if (catRedactionPollTimer) clearInterval(catRedactionPollTimer)
    } else if (data.status === 'processing') {
      catRedactionStatus.value = 'Rédaction en cours (Claude CLI)…'
      catRedactionStatusClass.value = 'text-violet-500'
    } else if (data.status === 'pending') {
      catRedactionStatus.value = 'En file d\'attente'
      catRedactionStatusClass.value = 'text-violet-400'
    }
  } catch {  }
}

function applyCatRedaction() {
  if (!catRedactionResult.value) return
  const r = catRedactionResult.value
  if (r.short_description) form.summary = r.short_description
  if (r.long_description) {
    form.description = r.long_description
    nextTick(() => {
      if (editorEl.value && mode.value === 'wysiwyg') editorEl.value.innerHTML = form.description
    })
  }
  catRedactionStatus.value = 'Résumé + Description appliqués'
  catRedactionStatusClass.value = 'text-emerald-600'
}

function applyCatFaqOnly() {
  if (!catRedactionResult.value?.faq_json) return
  try {
    const faqList = JSON.parse(catRedactionResult.value.faq_json)
    if (Array.isArray(faqList) && faqList.length) {
      form.faqs = faqList.map((f: any, i: number) => ({
        position: i, active: true, question: f.q || '', answer: f.a || '',
      }))
      catRedactionStatus.value = `${faqList.length} FAQ appliquées`
      catRedactionStatusClass.value = 'text-emerald-600'
    }
  } catch {  }
}

const aiMode = ref<'centaure' | 'api'>('centaure')
const centaurePrompt = ref('')
const centaureResponse = ref('')
const centaurePromptCopied = ref(false)

function generateCentaurePrompt() {
  const name = form.name?.trim() || ''
  const slug = form.slug?.trim() || ''
  const instr = catInstructions.value?.trim() || ''
  const existingH1 = form.h1?.trim() || ''
  const existingSummary = form.summary?.trim() || ''
  const existingDesc = (form.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 400)

  
  const h1IsLocked = existingH1.length > 0

  
  
  
  
  
  
  const piliersList = (((config.public as any).piliers ?? []) as string[])
    .map((p) => (p.split(':', 1)[0] || p))
  const pilierSlug = piliersList.length === 0
    ? ''
    : seoIsPillar.value
      ? (slug || piliersList[0])
      : (seoPillarAncestor.value?.slug ?? piliersList[0])
  
  
  const catUrl = (s: string) => pilierSlug ? `/${pilierSlug}/${s}/` : `/${s}/`
  const ancestorBaseUrl = pilierSlug ? `/${pilierSlug}/` : '/'

  
  let seoBlock = ''
  if (seoKeywords.value.length) {
    const top = seoKeywords.value.slice(0, 8)
    const lines = top.map(k =>
      `- "${k.query}" — pos. ${k.position}, ${k.impressions} impressions, ${k.clicks} clics, CTR ${k.ctr}% (${k.type})`
    ).join('\n')
    const h1Instr = h1IsLocked
      ? 'Le H1 a déjà été choisi — ne le réécris pas. Couvre 3-4 mots-clés secondaires dans la description longue.'
      : 'Intègre naturellement le top mot-clé dans le H1, le résumé et au moins un H2. Couvre 3-4 mots-clés secondaires dans la description longue.'
    seoBlock = `\n## Données Search Console (28 derniers jours)\nMots-clés réels qui cherchent cette catégorie sur Google :\n${lines}\n\n${h1Instr} N'invente pas de chiffres ou de positions — reste sur le fond éditorial.\n`
  }

  
  let pillarBlock = ''
  if (seoIsPillar.value && seoChildren.value.length) {
    const childList = seoChildren.value.map(c => `- ${c.name}`).join('\n')
    const h1Rule = h1IsLocked
      ? '- Le résumé doit rester **broad / transversal** (couvrir le domaine, pas une niche).'
      : '- H1 et résumé doivent rester **broad / transversaux** (couvrir le domaine, pas une niche).'
    pillarBlock = `\n## Structure de la page (cocon sémantique)\nCette catégorie est une **page pilier** avec ${seoChildren.value.length} sous-catégories :\n${childList}\n\nTon rôle :\n${h1Rule}\n- La description longue doit présenter et **annoncer chaque sous-catégorie** dans des sections H2 thématiques (1 H2 par grand cluster). Le but est que la pilier serve de hub qui distribue le PageRank vers les enfants.\n- N'utilise PAS de mots-clés ultra-spécifiques (ex: "noix", "pistache", "olives") dans le résumé — ils appartiennent aux sous-catégories.\n`
  }

  
  const h1Context = h1IsLocked
    ? `\nH1 fixé (à NE PAS réécrire — sert de contexte) :\n${existingH1}\n`
    : ''

  
  
  
  
  const ancestor = seoPillarAncestor.value
  let summaryBrief: string
  if (seoIsPillar.value) {
    summaryBrief = `Un **résumé** structuré en **3 paragraphes <p>** courts (~50-70 mots chacun, total 400-550 caractères) — la pilier reste plus sobre qu'une page feuille mais garde la même grammaire :

   • **§1 — Ancrage marque + sujet broad + cible** : ouvrir avec un ancrage caractéristique (ancienneté "Depuis…", savoir-faire "Spécialiste de…", positionnement "Capitale de…"). Présenter la pilier comme un hub avec son **mot-clé broad principal en <strong>**. Nommer 2-3 cibles d'audience précises.
   • **§2 — Tour des thématiques (3-4 enfants en <strong>)** : annoncer la diversité de l'offre en citant **3-4 grandes sous-catégories par leur nom en <strong>** (choisis les enfants stratégiques, pas tous). Pour chaque, une demi-phrase qui qualifie son rôle dans le catalogue. Pas de descente dans le détail produit (qui appartient aux feuilles).
   • **§3 — Promesse + closing CTA marque** : poser une promesse transverse (sourcing, étendue de gamme, expertise, présence locale…). Terminer par un **closing avec la marque** ("[Tenant] vous accompagne…", "Notre rôle chez [Tenant] est de…", tagline mémorable).

   Contraintes : pas de mot-clé ultra-spécifique (noix, pistache, olives) en strong — ces tokens appartiennent aux sous-catégories. Ne descendre dans aucun détail produit/format/calibre. 1-2 <strong> par §.${h1IsLocked ? ' Cohérent avec le H1 fixé ci-dessus.' : ''}`
  } else {
    const ancestorLink = ancestor
      ? `<a href="/${ancestor.slug}/">${ancestor.name.toLowerCase()}</a>`
      : `<a href="${ancestorBaseUrl}">offre globale</a>`
    summaryBrief = `Un **résumé** structuré en **3 paragraphes <p>** (~80-100 mots chacun, total 600-700 caractères), affiché en haut de page à côté de la cover. Structure universelle (s'applique à tout vertical : alimentaire, immobilier, e-commerce, services) — le vocabulaire métier vient du contexte (description existante + nom catégorie). Règles strictes :

   • **§1 — Ancrage + cible + sujet + lien remontant** : ouvrir avec un ancrage caractéristique (ancienneté de la marque "Depuis…", localisation "Capitale de…", savoir-faire "Spécialiste de…", etc. — choisis selon le contexte). Caractériser le sujet en 3 traits factuels distinctifs. Introduire le **sujet principal en <strong>**. Nommer 3-5 spécificités concrètes (variétés, types, zones, segments…). Terminer par une phrase qui rattache à l'offre globale via le **lien obligatoire ${ancestorLink}** (remonte vers la pilier ancêtre).
   • **§2 — Trois déclinaisons + caractéristiques factuelles** : énoncer la diversité de l'offre via **3 expressions distinctes en <strong>** (typologies, formats, zones, gammes…), chacune accompagnée d'une caractéristique factuelle concrète (calibre, surface, format, sourcing, niveau de gamme…). Optionnellement mentionner une marque propre / tagline tenant si présente dans le contexte. Élargir avec des variantes ou dérivés.
   • **§3 — Deux cibles ou use cases comparés + closing marque** : segmenter l'offre selon 2 cibles d'acheteurs ou 2 use cases distincts (ex: "investisseurs locatifs vs retraités", "service apéritif vs cuisson", "particuliers vs CHR", etc.). Pour chacun, recommander un produit/segment phare en <strong>. Terminer par un **closing avec la marque** : tagline mémorable, conseil expert ("Notre conseil…"), ou CTA marque ("[Tenant] vous guide / accompagne…").

   Contraintes : 3+ noms concrets par § (variétés, zones, formats, segments…), 1-3 <strong> par §, pas de prix chiffré (tarif grossiste / prix attractifs OK), ton expert et factuel, pas de superlatifs creux.${h1IsLocked ? ' Cohérent avec le H1 fixé ci-dessus.' : ''}`
  }

  
  const tasks: string[] = []
  if (!h1IsLocked) {
    tasks.push(`Un **H1** (60-70 caractères) ${seoIsPillar.value ? 'généraliste qui couvre le domaine entier (pas une niche). Si un mot-clé GSC broad est en page 2, intègre-le.' : 'qui répond au top mot-clé GSC ci-dessus s\'il y en a, sinon au nom de catégorie.'}`)
  }
  tasks.push(summaryBrief)

  let descBrief: string
  if (seoIsPillar.value) {
    const childSlugList = seoChildren.value.slice(0, 8).map(c => catUrl(c.slug)).join(', ')
    descBrief = `Une **description longue SEO** (1000–1500 mots) affichée en bas de page. Rôle = **hub qui distribue le PageRank vers les sous-catégories**, pas une page de destination. Structure :

   • **H2 d'introduction** (1 seul) qui pose la philosophie de la pilier (savoir-faire, sourcing, étendue de l'offre) — cite la marque tenant.
   • **Tableau récapitulatif des grands clusters** (1 section avec <table>) — colonnes type : "Cluster" / "Public cible" / "Spécificité" (ou Format produit, Niveau de gamme, etc.). 4-6 lignes (un par grand cluster regroupant 2-4 sous-cats).
   • **Un H2 par sous-catégorie stratégique** (les ${seoChildren.value.length} enfants — focus sur les plus importants, pas obligatoirement tous), chaque section :
     - 60-100 mots qui présentent la sous-cat (rôle, public, exemples génériques sans descendre dans le produit niche).
     - **Lien naturel vers son slug** : ex \`<a href="${catUrl(seoChildren.value[0]?.slug ?? 'sub')}">…</a>\`. URLs absolues à recopier telles quelles${pilierSlug ? `, NE PAS retirer le préfixe /${pilierSlug}/` : ''} : ${childSlugList}${seoChildren.value.length > 8 ? '…' : ''}.
     - Pas de mot-clé ultra-spécifique en <strong> (les tokens "noix", "pistache", "olives" appartiennent aux sous-cats — la pilier les évoque, ne les capte pas).
   • **H2 de closing** : promesse transverse + CTA marque tenant ("[Tenant] vous accompagne…", "Notre rôle chez [Tenant] est de…").

   HTML propre (<h2>, <p>, <table><thead><tr><th>…</th></tr></thead><tbody>…</tbody></table>, <strong>, <a>, <ul>). Aucune classe Tailwind. Aucun chiffre inventé.`
  } else {
    
    
    
    const siblingsList = seoSiblings.value.slice(0, 8)
      .map(s => `${s.name} → ${catUrl(s.slug)}`)
      .join(', ')
    const ancestorBacklink = ancestor ? `/${ancestor.slug}/` : ancestorBaseUrl

    
    const secondaryKw = seoKeywords.value.slice(0, 5).map(k => `"${k.query}"`).join(', ')

    descBrief = `Une **description longue SEO** (700–1000 mots) affichée en bas de page, structurée en **6 sections H2** thématiques. Layout responsive 2 colonnes côté front, donc chaque section doit être autonome et concise (~80-120 mots). Règles éditoriales :

   • **6 H2 courts et accrocheurs** (3-8 mots chacun, souvent avec ":" pour qualifier — ex: "Le Tramway : L'atout valorisation", "Notre conseil : calibre 19/21 pour l'apéritif", "Comparatif des Quartiers : Où acheter ?", "Conditionnement Pro : formats & calibres").
   • **Mix obligatoire de 6 angles** (adapter au vertical, ne pas tous traiter le même angle) :
     - Vision / projet / dynamique du sujet (ex: "Alicante Futura tech hub", "Sourcing direct Maroc-Grèce 2026").
     - **Comparatif tabulaire** — au moins 1 section utilise un <table> HTML avec thead+tbody (ex: Zone/Profil/Atouts pour immobilier ; Calibre/Use case/Recommandation pour produit).
     - Atout factuel infra / sourcing / certification (chiffres concrets ou différenciateur).
     - **Données chiffrées** — au moins 1 section avec des <strong>chiffres concrets</strong> (rendement %, calibre mm, durée jours, économie €, ratio…) — pas inventés, plausibles.
     - Lifestyle / use case / contexte d'usage du produit ou du sujet.
     - **Closing avec marque tenant** : dernière section qui mentionne explicitement la marque (depuis la description existante) avec un CTA implicite ("Notre rôle chez X est de…", "X vous accompagne…").
   • **Maillage interne obligatoire — 2 à 3 liens <a> répartis dans les sections** (jus PageRank vers le silo) :
     - 1 lien vers la pilier ancêtre : <a href="${ancestorBacklink}">…</a>.
     - 1 à 2 liens vers une sous-cat sœur thématiquement pertinente. URLs absolues à recopier telles quelles${pilierSlug ? ` (le préfixe /${pilierSlug}/ est obligatoire, ne le retire JAMAIS)` : ''} : ${siblingsList || '(aucune sœur listée)'}. NE FORGE PAS d'URL et ne raccourcis pas — utilise uniquement les URLs complètes ci-dessus.
     - Les liens doivent être contextuels (ancre = expression naturelle dans la phrase), pas des "voir aussi" en bas.
   • **Strongs ciblés GSC — 1 à 2 <strong> par H2** sur les mots-clés secondaires Search Console : ${secondaryKw || '(aucun keyword GSC)'}. Distribue-les dans les sections où ils sont sémantiquement légitimes (pas tous dans le même H2).
   • **HTML propre** : <h2>, <p>, <table><thead><tr><th>…</th></tr></thead><tbody>…</tbody></table>, <strong>, <a>, optionnellement <ul><li>. Pas de classes Tailwind (le rendu front les ajoute).
   • Aucun chiffre inventé / source forgée — reste sur du factuel plausible et auditable.`
  }
  tasks.push(descBrief)
  const tasksList = tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')

  
  const jsonShape = h1IsLocked
    ? `{
  "summary": "<p>HTML du résumé ici</p>",
  "description": "<h2>...</h2><p>...</p> HTML complet de la description longue ici"
}`
    : `{
  "h1": "Texte brut du H1 (60-70 caractères, sans balise)",
  "summary": "<p>HTML du résumé ici</p>",
  "description": "<h2>...</h2><p>...</p> HTML complet de la description longue ici"
}`

  centaurePrompt.value = `Tu rédiges la fiche d'une catégorie e-commerce. Adapte le ton et le vocabulaire au secteur visible dans la description existante et le nom de catégorie ci-dessous (alimentaire B2B, immobilier B2C, mode, services, etc.). Reste expert, factuel, sans superlatif creux.
${audienceBlock()}${instr ? `\nConsignes : ${instr}\n` : ''}
Catégorie : **${name}** (slug: ${slug || 'n/a'})
${h1Context}${existingSummary ? `\nRésumé existant à enrichir :\n${existingSummary}\n` : ''}${existingDesc ? `\nDescription existante à enrichir :\n${existingDesc}\n` : ''}${pillarBlock}${seoBlock}
Rédige :

${tasksList}

Format de réponse : **JSON valide uniquement**, sans texte autour, sans bloc \`\`\`. Structure :

${jsonShape}

Échappe les guillemets dans les valeurs (ex: \\" si nécessaire). Le HTML peut contenir des sauts de ligne — encode-les en \\n dans le JSON.`
}

function copyCentaurePrompt() {
  navigator.clipboard.writeText(centaurePrompt.value)
  centaurePromptCopied.value = true
  setTimeout(() => { centaurePromptCopied.value = false }, 2000)
}

function applyCentaureResponse() {
  const raw = centaureResponse.value.trim()
  if (!raw) return

  let parsed: { h1?: string; summary?: string; description?: string } | null = null

  
  
  const stripFences = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
  const firstBrace = stripFences.indexOf('{')
  const lastBrace  = stripFences.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = stripFences.slice(firstBrace, lastBrace + 1)
    try {
      parsed = JSON.parse(candidate)
    } catch (e1) {
      
      
      
      
      try {
        const sanitized = candidate.replace(
          /("[\w_]+"\s*:\s*")([\s\S]*?)("\s*(?:,|\}))/g,
          (_m, prefix, body, suffix) => {
            const fixed = body
              .replace(/(?<!\\)"/g, '\\"')
              .replace(/\r\n/g, '\\n')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\n')
              .replace(/\t/g, '\\t')
            return `${prefix}${fixed}${suffix}`
          },
        )
        parsed = JSON.parse(sanitized)
      } catch (e2) {
        console.error('[applyCentaureResponse] JSON parse failed', { error: e2, candidate })
      }
    }
  }

  
  if (!parsed) {
    const h1m   = raw.match(/---H1---\s*\n([\s\S]*?)(?=---SUMMARY---|$)/i)
    const sum   = raw.match(/---SUMMARY---\s*\n([\s\S]*?)(?=---DESCRIPTION---|$)/i)
    const desc  = raw.match(/---DESCRIPTION---\s*\n([\s\S]*?)$/i)
    const stripFence = (s: string) => s.trim().replace(/^```html?\s*\n?/, '').replace(/\n?```\s*$/, '')
    if (h1m || sum || desc) {
      parsed = {
        h1: h1m ? stripFence(h1m[1]) : undefined,
        summary: sum ? stripFence(sum[1]) : undefined,
        description: desc ? stripFence(desc[1]) : undefined,
      }
    }
  }

  
  
  if (!parsed) {
    const stripped = raw.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    if (/^</.test(stripped) && /<h2[\s>]/i.test(stripped)) {
      const h2Idx = stripped.search(/<h2[\s>]/i)
      const sumPart = stripped.slice(0, h2Idx).trim()
      const descPart = stripped.slice(h2Idx).trim()
      if (descPart) {
        parsed = {
          summary: sumPart || undefined,
          description: descPart,
        }
      }
    }
  }

  if (!parsed) {
    const preview = raw.slice(0, 120).replace(/\s+/g, ' ')
    console.error('[applyCentaureResponse] Format non reconnu', { rawLength: raw.length, preview, raw })
    catRedactionStatus.value = `Format non reconnu — attendu JSON {summary, description} ou HTML brut. Reçu : "${preview}…"`
    catRedactionStatusClass.value = 'text-red-500'
    return
  }

  const applied: string[] = []
  if (parsed.h1) {
    form.h1 = parsed.h1.trim().slice(0, 255)
    applied.push('H1')
  }
  if (parsed.summary) {
    form.summary = parsed.summary.trim()
    applied.push('Résumé')
  }
  if (parsed.description) {
    form.description = parsed.description.trim()
    applied.push('Description')
    nextTick(() => {
      if (editorEl.value && mode.value === 'wysiwyg') editorEl.value.innerHTML = form.description
    })
  }

  catRedactionStatus.value = applied.length
    ? `${applied.join(' + ')} Centaure appliqués`
    : 'Aucun champ extrait du JSON'
  catRedactionStatusClass.value = applied.length ? 'text-emerald-600' : 'text-amber-500'
}

const seoMode = ref<'centaure' | 'api'>('centaure')
const seoPrompt = ref('')
const seoResponse = ref('')
const seoPromptCopied = ref(false)
const seoApplyStatus = ref<string | null>(null)
const seoApplyStatusClass = ref('text-gray-400')

function generateSeoPrompt() {
  const name = form.name?.trim() || ''
  const slug = form.slug?.trim() || ''
  const h1 = form.h1?.trim() || ''
  const instr = catInstructions.value?.trim() || ''
  const sum = form.summary?.replace(/<[^>]+>/g, ' ').trim() || ''
  const desc = (form.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 800)

  
  let gscBlock = ''
  if (seoKeywords.value.length) {
    const top = seoKeywords.value.slice(0, 6)
    gscBlock = `\n## Données Search Console (28 derniers jours) — angles CTR\n${top.map(k => `- "${k.query}" — pos. ${k.position}, ${k.impressions} impressions, CTR ${k.ctr}% (${k.type})`).join('\n')}\n\nIntègre 1-2 top keywords broad dans le meta_title. Le meta_description doit refléter au moins un keyword "rewrite" (page 1 à faible CTR — angle d'amélioration).\n`
  }

  
  
  
  
  const slugIsValid = !!slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)

  
  const pillarHint = seoIsPillar.value
    ? 'Cette catégorie est une **page pilier** (hub). Le meta_title doit rester broad/transversal — pas de niche. Évite les tokens spécifiques aux sous-cats.'
    : 'Cette catégorie est une **page feuille**. Le meta_title peut s\'aligner sur le top keyword GSC niche pour maximiser le CTR.'

  
  const tasks: string[] = []
  tasks.push('**meta_title** — **≤ 60 caractères** (Google tronque au-delà), angle bénéfice concret. Doit être cohérent avec le H1 fixé sans le dupliquer mot pour mot.')
  tasks.push('**meta_description** — **145–160 caractères**, phrase complète terminant par un point ou un appel à l\'action implicite. Pas de troncature à mi-mot.')
  if (!slugIsValid) {
    tasks.push('**slug** — minuscules, tirets uniquement, sans accent ni stop word (ex: "fruits-secs-grossiste"). 2-4 mots max, intégrer le mot-clé principal.')
  }
  const tasksList = tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')

  
  const jsonShape = slugIsValid
    ? `{
  "meta_title": "…",
  "meta_description": "…"
}`
    : `{
  "meta_title": "…",
  "meta_description": "…",
  "slug": "nouveau-slug"
}`

  seoPrompt.value = `Tu optimises le SEO d'une fiche catégorie e-commerce. Adapte le ton au secteur visible dans le contexte ci-dessous (alimentaire B2B, immobilier B2C, mode, services, etc.). Objectif : maximiser le CTR Google.
${audienceBlock()}${instr ? `\nConsignes : ${instr}\n` : ''}
Catégorie : **${name}**${h1 ? `\nH1 fixé : ${h1}` : ''}${slugIsValid ? `\nSlug URL fixé (à NE PAS toucher) : /${slug}` : ''}${sum ? `\n\nRésumé :\n${sum}` : ''}${desc ? `\n\nContexte (description) :\n${desc}` : ''}${gscBlock}
${pillarHint}

Produis :

${tasksList}

Format de réponse : **JSON valide uniquement**, sans texte autour, sans bloc \`\`\`. Structure :

${jsonShape}`
}

function copySeoPrompt() {
  navigator.clipboard.writeText(seoPrompt.value)
  seoPromptCopied.value = true
  setTimeout(() => { seoPromptCopied.value = false }, 2000)
}

function applySeoResponse() {
  const raw = seoResponse.value.trim()
  if (!raw) return

  let parsed: { meta_title?: string; meta_description?: string; slug?: string; slug_change_reason?: string } | null = null

  
  const stripFences = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
  const firstBrace = stripFences.indexOf('{')
  const lastBrace = stripFences.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try { parsed = JSON.parse(stripFences.slice(firstBrace, lastBrace + 1)) } catch {  }
  }

  
  if (!parsed) {
    const mt = raw.match(/---META_TITLE---\s*\n([\s\S]*?)(?=---META_DESCRIPTION---|---SLUG---|$)/i)
    const md = raw.match(/---META_DESCRIPTION---\s*\n([\s\S]*?)(?=---SLUG---|$)/i)
    const sl = raw.match(/---SLUG---\s*\n([\s\S]*?)$/i)
    if (mt || md || sl) {
      parsed = {
        meta_title: mt?.[1]?.trim(),
        meta_description: md?.[1]?.trim(),
        slug: sl?.[1]?.trim(),
      }
    }
  }

  if (!parsed) {
    seoApplyStatus.value = 'Format réponse non reconnu (attendu : JSON {meta_title, meta_description, slug})'
    seoApplyStatusClass.value = 'text-red-500'
    return
  }

  const applied: string[] = []
  if (parsed.meta_title) {
    form.metaTitle = parsed.meta_title.trim().slice(0, 70)
    applied.push('Meta title')
  }
  if (parsed.meta_description) {
    form.metaDescription = parsed.meta_description.trim().slice(0, 170)
    applied.push('Meta description')
  }
  
  
  
  
  if (parsed.slug) {
    const currentValid = !!form.slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)
    if (!currentValid) {
      const cleanSlug = parsed.slug.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      if (cleanSlug) {
        form.slug = cleanSlug
        applied.push('Slug')
      }
    }
    
  }

  seoApplyStatus.value = applied.length
    ? `${applied.join(' + ')} appliqués — pensez à Enregistrer`
    : 'Aucune optimisation extraite du JSON'
  seoApplyStatusClass.value = applied.length ? 'text-emerald-600' : 'text-amber-500'
  setTimeout(() => { seoApplyStatus.value = null }, 5000)
}

const faqCentaurePrompt = ref('')
const faqCentaureResponse = ref('')
const faqCentaurePromptCopied = ref(false)

function generateFaqCentaurePrompt() {
  const name = form.name?.trim() || ''
  const sum = form.summary?.replace(/<[^>]+>/g, ' ').trim() || ''
  const desc = (form.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 2000)

  
  
  
  const rewriteKw = seoKeywords.value.filter(k => k.type === 'rewrite').slice(0, 5)
  const conquestKw = seoKeywords.value.filter(k => k.type === 'conquest').slice(0, 5)
  let gscBlock = ''
  if (rewriteKw.length || conquestKw.length) {
    gscBlock = `\n## Données Search Console (28 derniers jours)\n`
    if (rewriteKw.length) {
      gscBlock += `Questions implicites prioritaires (page 1 à faible CTR — l'utilisateur tape ça mais ne clique pas, donc la page ne répond pas) :\n${rewriteKw.map(k => `- "${k.query}" — pos. ${k.position}, CTR ${k.ctr}%`).join('\n')}\nFormule au moins 3 questions FAQ qui répondent directement à ces requêtes (reformulées en question naturelle).\n`
    }
    if (conquestKw.length) {
      gscBlock += `\nKeywords de conquête (page 2, à ramener) :\n${conquestKw.map(k => `- "${k.query}" — pos. ${k.position}, ${k.impressions} impr.`).join('\n')}\nFormule 2-3 questions ciblant ces requêtes.\n`
    }
  }

  
  const faqCount = seoIsPillar.value ? 10 : 15
  const angleHint = seoIsPillar.value
    ? 'Reste sur des questions broad/transversales (offre globale, livraison, paiement, accompagnement). Pas de question niche qui appartient aux sous-cats.'
    : 'Couvre les angles métier pertinents : caractéristiques produit, sourcing, conditionnement/format, conservation/usage, tarification, livraison, certifications. Adapte au vertical visible dans le contexte.'

  faqCentaurePrompt.value = `Tu rédiges les FAQ SEO pour la catégorie e-commerce **${name}**. Adapte le ton et les angles au secteur visible dans le contexte (alimentaire B2B, immobilier B2C, mode, services, etc.).
${audienceBlock()}${sum ? `\nRésumé :\n${sum}` : ''}${desc ? `\n\nDescription (contexte) :\n${desc}` : ''}${gscBlock}
${angleHint}

Génère **${faqCount} questions/réponses** SEO-friendly :
- Questions concises et concrètes (≤ 90 caractères, formulation naturelle "Comment / Quel / Pourquoi / Quelle est la différence…").
- Réponses en **2–4 phrases factuelles** (200–350 caractères), HTML simple autorisé (<strong>, <a>) — pas de liste sauf si nécessaire.
- Pas de réponse promo ("le meilleur du marché"), reste expert et factuel.
- Aucun chiffre inventé.

Format de réponse : **JSON valide uniquement**, sans texte autour, sans bloc \`\`\`. Structure :

{
  "faqs": [
    { "q": "Question 1 ?", "a": "Réponse concise et factuelle." },
    { "q": "Question 2 ?", "a": "…" }
  ]
}`
}

function copyFaqCentaurePrompt() {
  navigator.clipboard.writeText(faqCentaurePrompt.value)
  faqCentaurePromptCopied.value = true
  setTimeout(() => { faqCentaurePromptCopied.value = false }, 2000)
}

function applyFaqCentaureResponse() {
  const raw = faqCentaureResponse.value.trim()
  if (!raw) return

  
  let list: Array<{ q?: string; a?: string }> | null = null
  const stripFences = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
  const firstBrace = stripFences.indexOf('{')
  const lastBrace = stripFences.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(stripFences.slice(firstBrace, lastBrace + 1))
      if (Array.isArray(parsed.faqs)) list = parsed.faqs
    } catch {  }
  }

  
  if (!list) {
    const m = raw.match(/---FAQ_JSON---\s*\n([\s\S]*?)$/i)
    const body = (m ? m[1] : raw).trim().replace(/^```json?\s*\n?/, '').replace(/\n?```\s*$/, '')
    try {
      const parsed = JSON.parse(body)
      if (Array.isArray(parsed)) list = parsed
    } catch {  }
  }

  if (!list || !list.length) {
    catRedactionStatus.value = 'Format FAQ non reconnu (attendu : JSON {faqs: [{q,a}]})'
    catRedactionStatusClass.value = 'text-red-500'
    return
  }

  form.faqs = list.map((f, i) => ({
    position: i, active: true, question: f.q || '', answer: f.a || '',
  }))
  catRedactionStatus.value = `${list.length} FAQ Centaure appliquées`
  catRedactionStatusClass.value = 'text-emerald-600'
}

onMounted(() => {
  load()
  loadTenantBrief()
  
  if (route.params.id && route.params.id !== 'new') {
    checkCatCoverStatus()
    checkCatRedactionStatus()
    loadSeoKeywords()
  }
})

onUnmounted(() => {
  if (catCoverPollTimer) clearInterval(catCoverPollTimer)
  if (catRedactionPollTimer) clearInterval(catRedactionPollTimer)
})

watch(currentLangId, (newId, oldId) => {
  if (newId !== oldId && !loading.value) load()
})
</script>
