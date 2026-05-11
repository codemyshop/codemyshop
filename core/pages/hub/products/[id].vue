<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/products" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div v-if="product" class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">{{ product.name || 'Produit sans nom' }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">#{{ product.id }} — {{ product.reference || '—' }} — {{ product.categoryName || 'Sans catégorie' }}</p>
      </div>
      <div v-else class="flex-1" />
      <div class="flex items-center gap-2">
        
        <HubLangSelector aria-label="Langue d'édition du produit" />

        <span v-if="saved" class="text-xs text-green-600 font-medium">Sauvegardé</span>
        <span v-if="saveError" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="saveError">Erreur : {{ saveError }}</span>
        <a
          v-if="product"
          :href="productFrontUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
          title="Ouvrir la fiche produit publique dans un nouvel onglet"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          <span>Voir le produit</span>
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
          <div class="h-32 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>

    <div v-else-if="product" class="px-6 py-6">
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
            <HubProductImages
              :images="images"
              @upload-request="onUploadRequest"
              @remove="onImageRemove"
            />
            <HubProductGeneral v-model="form" />
            <HubProductCategories
              :categories="productCategories"
              v-model:default-id="form.defaultCategoryId"
              @remove="onCategoryRemove"
              @add-request="onCategoryAddRequest"
            />
            <HubProductCombinations ref="combinationsRef" :existing-combinations="productCombinations" />

            
            <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Caractéristiques ({{ features.length }})</h2>
                <span class="text-[10px] uppercase tracking-wide text-gray-400">Read-only</span>
              </div>
              <div v-if="features.length" class="space-y-1.5">
                <div v-for="f in features" :key="f.featureName" class="flex items-center gap-2 text-sm">
                  <span class="text-gray-500 font-medium min-w-[140px]">{{ f.featureName }}</span>
                  <span class="text-gray-800 dark:text-slate-100">{{ f.featureValue }}</span>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400">Aucune caractéristique</p>
            </div>
          </div>

          
          <div v-show="activeTab === 'description'" class="space-y-6">
            
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
                  v-model="prodInstructions"
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
                >Générer le prompt</button>

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
                    placeholder="Collez la réponse du LLM ici (---SUMMARY--- + ---DESCRIPTION---)..."
                    class="w-full text-[11px] font-mono bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                  <button
                    v-if="centaureResponse.trim()"
                    @click="applyCentaureResponse"
                    class="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >Appliquer Résumé + Description</button>
                </div>
              </div>

              
              <div v-if="aiMode === 'api'" class="mt-4 space-y-3">
                <button
                  @click="requestProductContent"
                  :disabled="prodRedactionGenerating || !form.name"
                  class="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5"
                >
                  <svg v-if="prodRedactionGenerating" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {{ prodRedactionGenerating ? 'En cours…' : 'Lancer la rédaction' }}
                </button>
                <p v-if="prodRedactionStatus" class="text-[10px]" :class="prodRedactionStatusClass">{{ prodRedactionStatus }}</p>

                <div v-if="prodRedactionResult" class="space-y-3">
                  <div class="border border-violet-200 dark:border-violet-800 rounded-lg p-3 bg-violet-50/50 dark:bg-violet-950/20 space-y-2">
                    <p class="text-[10px] font-semibold uppercase tracking-widest text-violet-600">Proposition IA</p>
                    <div v-if="prodRedactionResult.short_description">
                      <span class="text-[10px] text-gray-500">Résumé :</span>
                      <div class="text-xs text-gray-600 prose prose-sm" v-html="prodRedactionResult.short_description" />
                    </div>
                    <div v-if="prodRedactionResult.long_description">
                      <span class="text-[10px] text-gray-500">Description longue :</span>
                      <div class="text-xs text-gray-600 prose prose-sm max-h-40 overflow-auto" v-html="prodRedactionResult.long_description" />
                    </div>
                  </div>
                  <button @click="applyProductContent" class="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium">Appliquer Résumé + Description</button>
                </div>
              </div>
            </section>

            <HubProductDescription v-model="form" />
            <HubProductAttachments v-if="product" :product-id="Number(product.id)" />
          </div>

          
          <div v-show="activeTab === 'livraison'" class="space-y-6">
            <HubProductShipping v-model="form" />
          </div>

          
          <div v-show="activeTab === 'crossell'" class="space-y-6">
            <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Produits accessoires</h2>
                  <p class="text-xs text-gray-400 mt-0.5">Affichés comme « produits liés » sur la fiche client. Source : <span class="font-mono">ps_accessory</span>.</p>
                </div>
                <span class="text-[10px] uppercase tracking-wide text-gray-400">{{ accessories.length }} lié{{ accessories.length > 1 ? 's' : '' }}</span>
              </div>

              
              <div class="relative">
                <input
                  v-model="addSearch"
                  @input="onAddSearchInput"
                  type="text"
                  placeholder="Ajouter un accessoire — chercher par nom, réf, EAN…"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
                <div v-if="addResults.length" class="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-auto">
                  <button
                    v-for="p in (addResults as any[])"
                    :key="p.id"
                    type="button"
                    :disabled="p.alreadyLinked || addingId === p.id"
                    @click="addAccessory(p)"
                    class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border-b border-gray-50 dark:border-slate-800 last:border-0"
                  >
                    <div class="flex-1 min-w-0">
                      <span class="text-gray-800 dark:text-slate-100 font-medium truncate block">{{ p.name }}</span>
                      <span v-if="p.reference" class="text-[10px] text-gray-400 font-mono">#{{ p.id }} · {{ p.reference }}</span>
                      <span v-else class="text-[10px] text-gray-400 font-mono">#{{ p.id }}</span>
                    </div>
                    <span v-if="p.alreadyLinked" class="text-[10px] text-amber-600">Déjà lié</span>
                    <span v-else-if="addingId === p.id" class="text-[10px] text-violet-500">Ajout…</span>
                    <span v-else class="text-[10px] text-emerald-600">+ Ajouter</span>
                  </button>
                </div>
                <p v-if="addSearch.length >= 2 && !addSearchLoading && !addResults.length" class="text-[10px] text-gray-400 mt-1">Aucun produit trouvé.</p>
              </div>

              <p v-if="addFeedback" class="text-xs" :class="addFeedback.ok ? 'text-emerald-600' : 'text-amber-600'">{{ addFeedback.msg }}</p>

              
              <div v-if="accessoriesLoading" class="space-y-2">
                <div v-for="i in 3" :key="i" class="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              </div>
              <div v-else-if="accessoriesError" class="text-xs text-red-500">{{ accessoriesError }}</div>
              <div v-else-if="accessories.length" class="border border-gray-100 dark:border-slate-800 rounded-lg divide-y divide-gray-50 dark:divide-slate-800">
                <div v-for="a in accessories" :key="a.dst" class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                  <NuxtLink :to="`/hub/products/${a.dst}`" class="flex-1 min-w-0">
                    <span class="text-gray-800 dark:text-slate-100 truncate block">{{ a.dstName }}</span>
                    <span v-if="a.dstRef" class="text-[10px] text-gray-400 font-mono">#{{ a.dst }} · {{ a.dstRef }}</span>
                    <span v-else class="text-[10px] text-gray-400 font-mono">#{{ a.dst }}</span>
                  </NuxtLink>
                  <button
                    type="button"
                    @click="removeAccessory(a.dst)"
                    class="text-xs px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                    title="Retirer l'accessoire"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400 text-center py-6">Aucun accessoire lié. Utilisez la recherche ci-dessus pour en ajouter.</p>
            </section>
          </div>

          
          <div v-show="activeTab === 'seo'" class="space-y-6">
            
            <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Optimisation SEO par IA</h2>
                  <p class="text-xs text-gray-400 mt-0.5">Optimise meta_title, meta_description et slug pour maximiser le CTR.</p>
                </div>
                <div class="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    @click="seoMode = 'centaure'"
                    :class="['text-xs px-3 py-1.5 rounded-md font-medium transition-colors', seoMode === 'centaure' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                  >Centaure</button>
                  <button
                    @click="seoMode = 'api'"
                    :class="['text-xs px-3 py-1.5 rounded-md font-medium transition-colors', seoMode === 'api' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                  >API</button>
                </div>
              </div>

              
              <div v-if="seoMode === 'centaure'" class="space-y-3">
                <div class="flex items-center gap-2">
                  <button
                    @click="generateSeoPrompt"
                    :disabled="!form.name"
                    class="text-xs px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors font-medium"
                  >Générer le prompt</button>
                  <button
                    v-if="seoPrompt"
                    @click="copySeoPrompt"
                    class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
                  >{{ seoPromptCopied ? 'Copié !' : 'Copier' }}</button>
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
                      placeholder="---META_TITLE---&#10;...&#10;---META_DESCRIPTION---&#10;...&#10;---SLUG---&#10;mon-slug"
                      class="w-full text-[11px] font-mono bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                  <button
                    @click="applySeoResponse"
                    :disabled="!seoResponse"
                    class="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors font-medium"
                  >Appliquer les optimisations SEO</button>
                </div>
              </div>

              
              <div v-if="seoMode === 'api'" class="space-y-3">
                <button
                  @click="requestProductContent"
                  :disabled="prodRedactionGenerating || !form.name"
                  class="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5"
                >
                  <svg v-if="prodRedactionGenerating" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {{ prodRedactionGenerating ? 'En cours…' : 'Lancer l\'optimisation' }}
                </button>
                <p v-if="prodRedactionStatus" class="text-[10px]" :class="prodRedactionStatusClass">{{ prodRedactionStatus }}</p>

                <div v-if="prodRedactionResult" class="space-y-3">
                  <div class="border border-violet-200 dark:border-violet-800 rounded-lg p-3 bg-violet-50/50 dark:bg-violet-950/20 space-y-2">
                    <p class="text-[10px] font-semibold uppercase tracking-widest text-violet-600">Proposition IA</p>
                    <div v-if="prodRedactionResult.meta_title">
                      <span class="text-[10px] text-gray-500">Meta title :</span>
                      <p class="text-xs font-medium text-gray-800 dark:text-slate-100">{{ prodRedactionResult.meta_title }} <span class="text-[10px] text-gray-400">({{ prodRedactionResult.meta_title.length }}/60)</span></p>
                    </div>
                    <div v-if="prodRedactionResult.meta_description">
                      <span class="text-[10px] text-gray-500">Meta description :</span>
                      <p class="text-xs text-gray-600">{{ prodRedactionResult.meta_description }} <span class="text-[10px] text-gray-400">({{ prodRedactionResult.meta_description.length }}/160)</span></p>
                    </div>
                    <div v-if="prodRedactionResult.optimized_slug">
                      <span class="text-[10px] text-gray-500">Slug optimisé :</span>
                      <p class="text-xs font-mono text-gray-600">{{ prodRedactionResult.optimized_slug }}</p>
                    </div>
                  </div>
                  <button @click="applyProductSeo" class="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium">Appliquer SEO</button>
                </div>
              </div>

              <p v-if="seoApplyStatus" class="text-[10px]" :class="seoApplyStatusClass">{{ seoApplyStatus }}</p>
            </section>

            <HubProductSeo v-model="form" />
          </div>
        </div>

        
        <div class="space-y-6">
          <HubProductPricing v-model="form" :tax-rules="taxRules" />
          <HubProductStock v-model="form" />

          
          <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">État</h2>
              <span class="text-[10px] uppercase tracking-wide text-gray-400">Status</span>
            </div>
            <label class="flex items-center gap-3 text-sm cursor-pointer">
              <input type="checkbox" v-model="form.active" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span class="text-gray-800 dark:text-slate-100">Produit en ligne</span>
            </label>
            <p class="text-[11px] text-gray-400">Poids, dimensions et visibilité : onglet <span class="font-semibold">Essentiel</span> → Logistique / Visibilité.</p>
          </div>

          
          <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Prix spéciaux ({{ specificPrices.length }})</h2>
              <span class="text-[10px] uppercase tracking-wide text-gray-400">Read-only</span>
            </div>
            <div v-if="specificPrices.length" class="space-y-2">
              <div v-for="sp in specificPrices" :key="sp.id" class="flex items-center gap-3 text-sm border-b border-gray-50 dark:border-slate-800/50 pb-2 last:border-0">
                <span class="text-gray-800 dark:text-slate-100 font-medium">
                  {{ sp.reductionType === 'percentage' ? (sp.reduction * 100).toFixed(0) + '%' : formatEur(sp.reduction) }}
                </span>
                <span v-if="sp.fromQuantity > 1" class="text-xs text-gray-400">dès {{ sp.fromQuantity }} u.</span>
                <span v-if="sp.customerId" class="text-xs text-gray-400">client #{{ sp.customerId }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400">Aucun prix spécial</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="px-6 py-16 text-center">
      <p class="text-sm text-gray-500">Produit introuvable.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const route = useRoute()

const { currentLangId } = useHubLang()

const product = ref<any>(null)
const features = ref<any[]>([])
const specificPrices = ref<any[]>([])
const productCategories = ref<any[]>([])
const productCombinations = ref<any[]>([])
const taxRules = ref<Array<{ id: number; label: string; rate: number }>>([])
const images = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)
const combinationsRef = ref<{ getDirtyCombinations: () => Array<{ id: number; priceImpact: number; quantity: number; reference: string }> } | null>(null)

const form = reactive({
  name: '',
  reference: '',
  ean13: '',
  descriptionShort: '',
  description: '',
  wholesalePrice: 0,
  priceHT: 0,
  taxRulesGroupId: 0,
  stock: 0,
  weight: 0,
  width: 0,
  height: 0,
  depth: 0,
  availableForOrder: true,
  showPrice: true,
  active: true,
  metaTitle: '',
  metaDescription: '',
  linkRewrite: '',
  defaultCategoryId: 0,
  additionalShippingCost: 0,
  deliveryInStock: '',
  deliveryOutStock: '',
  carrierRefs: [] as number[],
})

const productFrontUrl = ref<string>('#')

async function refreshProductFrontUrl() {
  const id = Number(product.value?.id ?? route.params.id)
  if (!id) { productFrontUrl.value = '#'; return }
  try {
    const res = await $fetch<{ found: boolean; path?: string }>(
      `/api/product-url-by-id`,
      { query: { id, lang: currentLangId.value } },
    )
    if (res?.found && res.path) {
      productFrontUrl.value = res.path
      return
    }
  } catch (err) {
    console.warn('refreshProductFrontUrl error', err)
  }
  const slug = form.linkRewrite || product.value?.slug || ''
  productFrontUrl.value = slug ? `/p/${id}-${slug}` : `/p/${id}`
}

type ProductTab = 'essentiel' | 'description' | 'livraison' | 'seo' | 'crossell'
const activeTab = ref<ProductTab>('essentiel')
const tabs: Array<{ id: ProductTab; label: string }> = [
  { id: 'essentiel', label: 'Essentiel' },
  { id: 'description', label: 'Description' },
  { id: 'livraison', label: 'Livraison' },
  { id: 'crossell', label: 'Cross-selling' },
  { id: 'seo', label: 'Référencement' },
]

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>(`/api/bo/products/${route.params.id}`, {
      query: { lang: currentLangId.value },
    })
    product.value = data.product
    features.value = data.features ?? []
    specificPrices.value = data.specificPrices ?? []
    productCategories.value = data.categories ?? []
    productCombinations.value = data.combinations ?? []
    taxRules.value = (data.taxRules ?? []).map((r: any) => ({ id: Number(r.id), label: String(r.label), rate: Number(r.rate) }))
    images.value = (data.images ?? []).map((img: any) => ({
      id: img.id,
      cover: !!img.cover,
      position: img.position,
      url: product.value?.id ? `/img/p/${String(img.id).split('').join('/')}/${img.id}.jpg` : undefined,
    }))

    const p = data.product
    form.name = p.name || ''
    form.reference = p.reference || ''
    form.ean13 = p.ean13 || ''
    form.descriptionShort = p.descriptionShort || ''
    form.description = p.description || ''
    form.wholesalePrice = Number(p.wholesalePrice) || 0
    form.priceHT = Number(p.priceHT) || 0
    form.taxRulesGroupId = Number(p.taxRulesGroupId) || 0
    form.stock = Number(p.stock) || 0
    form.weight = Number(p.weight) || 0
    form.width = Number(p.width) || 0
    form.height = Number(p.height) || 0
    form.depth = Number(p.depth) || 0
    form.availableForOrder = p.availableForOrder === null || p.availableForOrder === undefined ? true : !!p.availableForOrder
    form.showPrice = p.showPrice === null || p.showPrice === undefined ? true : !!p.showPrice
    form.additionalShippingCost = Number(p.additionalShippingCost) || 0
    form.deliveryInStock = p.deliveryInStock || ''
    form.deliveryOutStock = p.deliveryOutStock || ''
    form.carrierRefs = Array.isArray(data.carrierRefs) ? data.carrierRefs.map((n: any) => Number(n)).filter(Boolean) : []
    form.active = !!p.active
    form.metaTitle = p.metaTitle || ''
    form.metaDescription = p.metaDescription || ''
    form.linkRewrite = p.slug || ''
    form.defaultCategoryId = Number(p.categoryId) || 0
    await refreshProductFrontUrl()
  } catch (err) {
    console.error('Load product error:', err)
    product.value = null
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = null
  try {
    const dirtyCombinations = combinationsRef.value?.getDirtyCombinations() ?? []
    const categoryIds = productCategories.value.map((c: any) => Number(c.id)).filter(Boolean)

    const payload = {
      name: form.name,
      reference: form.reference,
      ean13: form.ean13,
      descriptionShort: form.descriptionShort,
      description: form.description,
      wholesalePrice: form.wholesalePrice,
      priceHT: form.priceHT,
      taxRulesGroupId: form.taxRulesGroupId,
      stock: form.stock,
      weight: form.weight,
      width: form.width,
      height: form.height,
      depth: form.depth,
      availableForOrder: form.availableForOrder,
      showPrice: form.showPrice,
      active: form.active,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      linkRewrite: form.linkRewrite,
      additionalShippingCost: form.additionalShippingCost,
      deliveryInStock: form.deliveryInStock,
      deliveryOutStock: form.deliveryOutStock,
      carrierRefs: form.carrierRefs,
      categoryId: form.defaultCategoryId,
      categoryIds,
      combinations: dirtyCombinations,
    }

    await $fetch(`/api/bo/products/${route.params.id}`, {
      method: 'PUT',
      query: { lang: currentLangId.value },
      body: payload,
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (err: any) {
    console.error('Save error:', err)
    saveError.value = err?.data?.message || err?.message || 'Échec de la sauvegarde'
    setTimeout(() => { saveError.value = null }, 6000)
  } finally {
    saving.value = false
  }
}

function formatEur(n: number) {
  return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function onUploadRequest() {
  console.log('[hub/product] upload requested — modal upload à brancher')
}

function onImageRemove(id: number | string) {
  console.log('[hub/product] remove image', id)
}

function onCategoryRemove(id: number) {
  productCategories.value = productCategories.value.filter((c: any) => c.id !== id)
  if (form.defaultCategoryId === id) form.defaultCategoryId = 0
}

function onCategoryAddRequest() {
  console.log('[hub/product] add categories requested — tree-picker à brancher')
}

interface AccessoryRule { src: number; dst: number; srcName: string; dstName: string; srcRef: string; dstRef: string }
const accessories = ref<AccessoryRule[]>([])
const accessoriesLoading = ref(false)
const accessoriesError = ref<string | null>(null)
const addSearch = ref('')
const addResults = ref<Array<{ id: number; name: string; reference?: string }>>([])
const addSearchLoading = ref(false)
const addSearchTimer = ref<any>(null)
const addingId = ref<number | null>(null)
const addFeedback = ref<{ msg: string; ok: boolean } | null>(null)

async function loadAccessories() {
  if (!route.params.id) return
  accessoriesLoading.value = true
  accessoriesError.value = null
  try {
    const data = await $fetch<any>('/api/bo/products/cross-sell/rules', {
      query: { src: Number(route.params.id) },
    })
    accessories.value = data?.rules || []
  } catch (err: any) {
    accessoriesError.value = err?.data?.message || 'Impossible de charger les accessoires'
  } finally {
    accessoriesLoading.value = false
  }
}

function onAddSearchInput() {
  clearTimeout(addSearchTimer.value)
  const q = addSearch.value.trim()
  if (q.length < 2) {
    addResults.value = []
    return
  }
  addSearchTimer.value = setTimeout(async () => {
    addSearchLoading.value = true
    try {
      const data = await $fetch<any>('/api/bo/products', {
        query: { search: q, perPage: 15, page: 1 },
      })
      const currentId = Number(route.params.id)
      const takenIds = new Set(accessories.value.map(a => a.dst))
      addResults.value = (data?.products || [])
        .filter((p: any) => Number(p.id) !== currentId)
        .map((p: any) => ({
          id: Number(p.id),
          name: p.name || `#${p.id}`,
          reference: p.reference || '',
          alreadyLinked: takenIds.has(Number(p.id)),
        }))
    } catch { addResults.value = [] }
    finally { addSearchLoading.value = false }
  }, 250)
}

async function addAccessory(p: { id: number; name: string; reference?: string }) {
  const src = Number(route.params.id)
  if (!src || !p.id || src === p.id) return
  addingId.value = p.id
  addFeedback.value = null
  try {
    const res = await $fetch<any>('/api/bo/products/cross-sell/rules', {
      method: 'POST',
      body: { src, dst: p.id },
    })
    if (res?.alreadyExists) {
      addFeedback.value = { msg: `${p.name} déjà présent dans les accessoires`, ok: false }
    } else {
      addFeedback.value = { msg: `${p.name} ajouté`, ok: true }
    }
    addSearch.value = ''
    addResults.value = []
    await loadAccessories()
  } catch (err: any) {
    addFeedback.value = { msg: err?.statusMessage || 'Erreur lors de l\'ajout', ok: false }
  } finally {
    addingId.value = null
    setTimeout(() => { addFeedback.value = null }, 4000)
  }
}

async function removeAccessory(dst: number) {
  const src = Number(route.params.id)
  if (!src || !dst) return
  try {
    await $fetch('/api/bo/products/cross-sell/rules', {
      method: 'DELETE',
      query: { src, dst },
    })
    await loadAccessories()
  } catch (err: any) {
    accessoriesError.value = err?.data?.message || 'Suppression échouée'
  }
}

const prodInstructions = ref('')
const prodRedactionGenerating = ref(false)
const prodRedactionStatus = ref<string | null>(null)
const prodRedactionStatusClass = ref('text-gray-400')
const prodRedactionResult = ref<{ short_description: string; long_description: string; meta_title: string; meta_description: string; optimized_slug: string } | null>(null)

async function requestProductContent() {
  if (!form.name || !route.params.id) return
  prodRedactionGenerating.value = true
  prodRedactionStatus.value = 'Envoi…'
  prodRedactionResult.value = null
  try {
    const res = await $fetch<any>('/api/bo/products/generate-content', {
      method: 'POST',
      body: { id_product: Number(route.params.id), name: form.name, slug: form.linkRewrite || form.reference, instructions: prodInstructions.value || undefined },
    })
    prodRedactionStatus.value = res.message || 'En queue'
    prodRedactionStatusClass.value = 'text-violet-500'
    startProdRedactionPoll()
  } catch (err: any) {
    prodRedactionGenerating.value = false
    prodRedactionStatus.value = err?.data?.message || 'Erreur'
    prodRedactionStatusClass.value = 'text-red-500'
  }
}

let prodRedactionPollTimer: ReturnType<typeof setInterval> | null = null
function startProdRedactionPoll() {
  if (prodRedactionPollTimer) clearInterval(prodRedactionPollTimer)
  prodRedactionPollTimer = setInterval(checkProdRedactionStatus, 20000)
}

async function checkProdRedactionStatus() {
  try {
    const data = await $fetch<any>('/api/bo/products/content-status', { query: { id_product: route.params.id } })
    if (!data.found) return
    if (data.status === 'done' && data.short_description) {
      prodRedactionGenerating.value = false
      prodRedactionResult.value = {
        short_description: data.short_description || '',
        long_description: data.long_description || '',
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        optimized_slug: data.optimized_slug || '',
      }
      prodRedactionStatus.value = 'Rédaction terminée'
      prodRedactionStatusClass.value = 'text-emerald-600'
      if (prodRedactionPollTimer) clearInterval(prodRedactionPollTimer)
    } else if (data.status === 'error') {
      prodRedactionGenerating.value = false
      prodRedactionStatus.value = `Erreur : ${data.error_msg || 'inconnue'}`
      prodRedactionStatusClass.value = 'text-red-500'
      if (prodRedactionPollTimer) clearInterval(prodRedactionPollTimer)
    } else if (data.status === 'processing') {
      prodRedactionStatus.value = 'Rédaction en cours (Claude CLI)…'
      prodRedactionStatusClass.value = 'text-violet-500'
    } else if (data.status === 'pending') {
      prodRedactionStatus.value = 'En file d\'attente'
      prodRedactionStatusClass.value = 'text-violet-400'
    }
  } catch {  }
}

function applyProductContent() {
  if (!prodRedactionResult.value) return
  if (prodRedactionResult.value.short_description) form.descriptionShort = prodRedactionResult.value.short_description
  if (prodRedactionResult.value.long_description) form.description = prodRedactionResult.value.long_description
  prodRedactionStatus.value = 'Résumé + Description appliqués'
  prodRedactionStatusClass.value = 'text-emerald-600'
}

function applyProductSeo() {
  if (!prodRedactionResult.value) return
  if (prodRedactionResult.value.meta_title) form.metaTitle = prodRedactionResult.value.meta_title
  if (prodRedactionResult.value.meta_description) form.metaDescription = prodRedactionResult.value.meta_description
  if (prodRedactionResult.value.optimized_slug) form.linkRewrite = prodRedactionResult.value.optimized_slug
  prodRedactionStatus.value = 'SEO appliqué — pensez à Enregistrer'
  prodRedactionStatusClass.value = 'text-emerald-600'
}

const aiMode = ref<'centaure' | 'api'>('centaure')
const centaurePrompt = ref('')
const centaureResponse = ref('')
const centaurePromptCopied = ref(false)

function generateCentaurePrompt() {
  const name = form.name?.trim() || ''
  const productRef = form.reference?.trim() || ''
  const instr = prodInstructions.value?.trim() || ''
  const existingShort = (form.descriptionShort || '').replace(/<[^>]+>/g, ' ').trim()
  const existingLong = (form.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 400)

  centaurePrompt.value = `Tu rédiges pour une boutique B2B grossiste agroalimentaire (Example Shop, Rungis).
Cible : acheteurs pro (CHR, détaillants, grossistes). Ton : expert, factuel, direct.
${instr ? `\nConsignes : ${instr}\n` : ''}
Produit : **${name}**${productRef ? ` (réf. ${productRef})` : ''}
${existingShort ? `\nRésumé existant à enrichir :\n${existingShort}\n` : ''}${existingLong ? `\nDescription existante à enrichir :\n${existingLong}\n` : ''}
Rédige :

1. Un **résumé** court (2–3 phrases, 150–250 caractères) qui positionne le produit — affiché sur la fiche et les grilles catalogue. HTML simple (<p>).
2. Une **description longue** (400–700 mots) pour la fiche produit : caractéristiques, usages pro (CHR, revente, transformation), arguments B2B (conditionnement, conservation, origine), structure claire avec <h3>/<p>/<ul>. Pas de <h1>/<h2>.

Format de réponse EXACT :

---SUMMARY---
(HTML du résumé ici)
---DESCRIPTION---
(HTML de la description longue ici)`
}

function copyCentaurePrompt() {
  navigator.clipboard.writeText(centaurePrompt.value)
  centaurePromptCopied.value = true
  setTimeout(() => { centaurePromptCopied.value = false }, 2000)
}

function applyCentaureResponse() {
  const raw = centaureResponse.value.trim()
  if (!raw) return
  const sum = raw.match(/---SUMMARY---\s*\n([\s\S]*?)(?=---DESCRIPTION---|$)/i)
  const desc = raw.match(/---DESCRIPTION---\s*\n([\s\S]*?)$/i)

  if (sum) form.descriptionShort = sum[1].trim().replace(/^```html?\s*\n?/, '').replace(/\n?```\s*$/, '')
  if (desc) form.description = desc[1].trim().replace(/^```html?\s*\n?/, '').replace(/\n?```\s*$/, '')

  prodRedactionStatus.value = 'Résumé + Description Centaure appliqués'
  prodRedactionStatusClass.value = 'text-emerald-600'
}

const seoMode = ref<'centaure' | 'api'>('centaure')
const seoPrompt = ref('')
const seoResponse = ref('')
const seoPromptCopied = ref(false)
const seoApplyStatus = ref<string | null>(null)
const seoApplyStatusClass = ref('text-gray-400')

function generateSeoPrompt() {
  const name = form.name?.trim() || ''
  const productRef = form.reference?.trim() || ''
  const slug = form.linkRewrite?.trim() || ''
  const instr = prodInstructions.value?.trim() || ''
  const sum = (form.descriptionShort || '').replace(/<[^>]+>/g, ' ').trim()
  const desc = (form.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 800)

  seoPrompt.value = `Tu optimises le SEO d'une fiche produit B2B grossiste agroalimentaire (Example Shop, Rungis).
Cible : acheteurs pro (CHR, détaillants). Objectif : maximiser le CTR Google.
${instr ? `\nConsignes : ${instr}\n` : ''}
Produit : **${name}**${productRef ? ` (réf. ${productRef})` : ''}
${sum ? `\nRésumé :\n${sum}\n` : ''}${desc ? `\nContexte (description) :\n${desc}\n` : ''}
Produis :

1. **meta_title** optimisé CTR — ≤ 60 caractères, angle bénéfice concret + conditionnement/volume pro.
2. **meta_description** — 145–160 caractères, pitch + appel à l'action implicite.
3. **slug** minuscules, tirets, sans stop word ni accent (ex: pistaches-grillees-1kg).

Format de réponse EXACT :

---META_TITLE---
(title ici)
---META_DESCRIPTION---
(description ici)
---SLUG---
(slug ici)

Slug actuel à améliorer si pertinent : ${slug || '(vide)'}`
}

function copySeoPrompt() {
  navigator.clipboard.writeText(seoPrompt.value)
  seoPromptCopied.value = true
  setTimeout(() => { seoPromptCopied.value = false }, 2000)
}

function applySeoResponse() {
  const raw = seoResponse.value.trim()
  if (!raw) return
  const mt = raw.match(/---META_TITLE---\s*\n([\s\S]*?)(?=---META_DESCRIPTION---|---SLUG---|$)/i)
  const md = raw.match(/---META_DESCRIPTION---\s*\n([\s\S]*?)(?=---SLUG---|$)/i)
  const sl = raw.match(/---SLUG---\s*\n([\s\S]*?)$/i)

  if (mt) form.metaTitle = mt[1].trim()
  if (md) form.metaDescription = md[1].trim()
  if (sl) form.linkRewrite = sl[1].trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  seoApplyStatus.value = 'Optimisations SEO appliquées — pensez à Enregistrer'
  seoApplyStatusClass.value = 'text-emerald-600'
  setTimeout(() => { seoApplyStatus.value = null }, 5000)
}

onMounted(() => {
  load()
  
  if (route.params.id && route.params.id !== 'new') {
    checkProdRedactionStatus()
    loadAccessories()
  }
})

onUnmounted(() => {
  if (prodRedactionPollTimer) clearInterval(prodRedactionPollTimer)
})

watch(currentLangId, (newId, oldId) => {
  if (newId !== oldId && !loading.value) load()
})
</script>
