<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Avatars IA</h1>
          <p class="text-xs text-gray-400 mt-0.5">{{ avatars.length }} avatar(s) configur&eacute;(s)</p>
        </div>
        <button
          @click="openCreate"
          class="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Cr&eacute;er un Avatar
        </button>
      </div>
    </header>

    <div class="p-6 max-w-5xl mx-auto space-y-6">

      <!-- Avatar grid -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5 animate-pulse">
          <div class="flex gap-3"><div class="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl" /><div class="flex-1 space-y-2"><div class="h-4 bg-gray-100 dark:bg-slate-800 rounded w-1/2" /><div class="h-3 bg-gray-50 rounded w-1/3" /></div></div>
        </div>
      </div>

      <div v-else-if="!avatars.length" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-10 text-center">
        <div class="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-2xl">&#x1f9d1;&#x200d;&#x1f4bb;</div>
        <p class="text-sm font-bold text-gray-700 dark:text-slate-200 mb-1">Aucun avatar configur&eacute;</p>
        <p class="text-xs text-gray-400 mb-4">Cr&eacute;ez votre premier avatar pour personnaliser vos contenus IA.</p>
        <button @click="openCreate" class="text-sm text-primary-600 font-semibold hover:underline">+ Cr&eacute;er un avatar</button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="av in avatars"
          :key="av.id"
          class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 hover:shadow-md transition-shadow group cursor-pointer"
          @click="openEdit(av)"
        >
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" :class="av.colorClass">
              {{ av.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <p class="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{{ av.name }}</p>
                <span class="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{{ av.slug }}</span>
              </div>
              <!-- Keywords -->
              <div class="flex flex-wrap gap-1 mt-1.5 mb-2">
                <span
                  v-for="kw in av.keywords.slice(0, 5)"
                  :key="kw"
                  class="text-[10px] bg-gray-50 border border-gray-100 dark:border-slate-800 text-gray-500 px-1.5 py-0.5 rounded-full"
                >{{ kw }}</span>
                <span v-if="av.keywords.length > 5" class="text-[10px] text-gray-400">+{{ av.keywords.length - 5 }}</span>
              </div>
              <!-- Pain points preview -->
              <p v-if="av.painPoints" class="text-xs text-gray-400 line-clamp-1 leading-relaxed">
                <span class="font-medium text-gray-500">Douleurs :</span> {{ av.painPoints }}
              </p>
              <p v-else-if="av.toneRules" class="text-xs text-gray-400 line-clamp-1 leading-relaxed">{{ av.toneRules }}</p>
              <p v-if="av.personas?.length" class="text-[10px] text-orange-500 mt-1 font-medium">{{ av.personas.length }} persona(s)</p>

              <!-- Top produits cibles -->
              <div v-if="(av.products?.length ?? 0)" class="mt-2 pt-2 border-t border-gray-50">
                <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Top produits</p>
                <div class="space-y-0.5">
                  <p v-for="p in av.products" :key="p.idProduct" class="text-[11px] text-gray-600 leading-snug truncate">
                    <span class="text-primary-600 font-bold">#{{ p.position }}</span>
                    <span class="ml-1">{{ p.productName || `Produit ${p.idProduct}` }}</span>
                  </p>
                </div>
              </div>

              <!-- Zones d'influence -->
              <div v-if="(av.zones?.length ?? 0)" class="mt-2 pt-2 border-t border-gray-50">
                <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Zones d'influence</p>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="z in av.zones"
                    :key="`${z.zoneType}|${z.zoneCode}`"
                    class="text-[10px] px-1.5 py-0.5 rounded-full border"
                    :class="zoneBadgeClass(z.weight)"
                    :title="z.reason || ''"
                  >{{ z.zoneLabel }}<span class="opacity-60 ml-1">{{ z.weight }}</span></span>
                </div>
              </div>
            </div>
            <!-- Actions -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                @click.stop="confirmDelete(av)"
                class="p-1.5 rounded-lg text-gray-400 hover:text-danger-500 hover:bg-danger-50 transition-colors"
                title="Supprimer"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
          <!-- Completeness indicator -->
          <div class="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
            <div class="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
              <div class="h-1.5 rounded-full bg-primary-400 transition-all" :style="`width: ${completeness(av)}%`" />
            </div>
            <span class="text-[10px] font-semibold text-gray-500">{{ completeness(av) }}% complet</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Slide-over Cr&eacute;er/Modifier -->
    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
        <div v-if="slideOpen" class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="slideOpen = false" />
          <Transition enter-active-class="transition-transform duration-250" enter-from-class="translate-x-full" leave-active-class="transition-transform duration-200" leave-to-class="translate-x-full">
            <div v-if="slideOpen" class="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full">
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
                <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ editingId ? 'Modifier l\u2019avatar' : 'Cr\u00e9er un avatar' }}</h2>
                <button @click="slideOpen = false" class="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <!-- Formulaire -->
              <form @submit.prevent="saveAvatar" class="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                <!-- Section : Identit&eacute; -->
                <fieldset>
                  <legend class="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-bold">1</span>
                    Identit&eacute;
                  </legend>
                  <div class="space-y-4">
                    <div>
                      <label class="field-label">Nom de l'avatar *</label>
                      <input v-model="form.name" required placeholder="Ex: Grossiste B2B" class="input-field" />
                    </div>
                    <div>
                      <label class="field-label">Slug *</label>
                      <input v-model="form.slug" required placeholder="Ex: grossiste-b2b" class="input-field font-mono text-xs" />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="field-label">Ic&ocirc;ne (emoji)</label>
                        <input v-model="form.icon" placeholder="&#x1f4bc;" class="input-field text-center text-lg" maxlength="4" />
                      </div>
                      <div>
                        <label class="field-label">Couleur</label>
                        <select v-model="form.colorClass" class="input-field text-xs">
                          <option value="bg-violet-100 text-violet-700">Violet</option>
                          <option value="bg-blue-100 text-blue-700">Bleu</option>
                          <option value="bg-green-100 text-green-700">Vert</option>
                          <option value="bg-amber-100 text-amber-700">Ambre</option>
                          <option value="bg-indigo-100 text-indigo-700">Indigo</option>
                          <option value="bg-orange-100 text-orange-700">Orange</option>
                          <option value="bg-primary-100 text-primary-700">Primary</option>
                          <option value="bg-gray-100 dark:bg-slate-800 text-gray-600">Gris</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label class="field-label">Mots-cl&eacute;s d&eacute;clencheurs</label>
                      <input v-model="keywordsInput" placeholder="palette, tva, volume, franco (s&eacute;par&eacute;s par virgule)" class="input-field text-xs" />
                      <div class="flex flex-wrap gap-1 mt-2">
                        <span v-for="kw in parsedKeywords" :key="kw" class="text-[10px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-100">{{ kw }}</span>
                      </div>
                    </div>
                  </div>
                </fieldset>

                <!-- Section : Profil IA -->
                <fieldset>
                  <legend class="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold">2</span>
                    Profil IA
                  </legend>
                  <div class="space-y-4">
                    <div>
                      <label class="field-label">Ton &amp; r&egrave;gles d'affichage</label>
                      <textarea v-model="form.toneRules" rows="3" placeholder="Ex: Ton direct et technique, masquer la TVA, prix HT uniquement..." class="input-field resize-none text-xs" />
                    </div>
                    <div>
                      <label class="field-label">Comportement d'achat</label>
                      <textarea v-model="form.buyingBehavior" rows="3" placeholder="Ex: Commande en gros (palettes), compare 3 fournisseurs, n&eacute;gocie les frais de port..." class="input-field resize-none text-xs" />
                    </div>
                    <div>
                      <label class="field-label">Points de douleur</label>
                      <textarea v-model="form.painPoints" rows="3" placeholder="Ex: D&eacute;lais de livraison imprévisibles, qualit&eacute; irr&eacute;guli&egrave;re, manque de r&eacute;activit&eacute; fournisseur..." class="input-field resize-none text-xs" />
                    </div>
                    <div>
                      <label class="field-label">Objectifs &amp; motivations</label>
                      <textarea v-model="form.goals" rows="3" placeholder="Ex: R&eacute;duire les co&ucirc;ts d'approvisionnement de 15%, diversifier les sources..." class="input-field resize-none text-xs" />
                    </div>
                    <div>
                      <label class="field-label">Objections fr&eacute;quentes</label>
                      <textarea v-model="form.objections" rows="3" placeholder="Ex: &laquo; C'est trop cher &raquo;, &laquo; Je travaille d&eacute;j&agrave; avec un fournisseur &raquo;, &laquo; Pas le temps &raquo;..." class="input-field resize-none text-xs" />
                    </div>
                  </div>
                </fieldset>

                <!-- Section : D&eacute;mographie & Canaux -->
                <fieldset>
                  <legend class="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">3</span>
                    D&eacute;mographie &amp; Canaux
                  </legend>
                  <div class="space-y-4">
                    <div>
                      <label class="field-label">D&eacute;mographie</label>
                      <textarea v-model="form.demographics" rows="2" placeholder="Ex: Dirigeant PME, 40-55 ans, secteur agroalimentaire, 10-50 salari&eacute;s" class="input-field resize-none text-xs" />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="field-label">Fourchette budget</label>
                        <input v-model="form.budgetRange" placeholder="Ex: 5k-50k&euro;/an" class="input-field text-xs" />
                      </div>
                      <div>
                        <label class="field-label">Cycle de d&eacute;cision</label>
                        <select v-model="form.decisionCycle" class="input-field text-xs">
                          <option value="">Non d&eacute;fini</option>
                          <option value="court">Court (&lt; 1 semaine)</option>
                          <option value="moyen">Moyen (1-4 semaines)</option>
                          <option value="long">Long (&gt; 1 mois)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label class="field-label">Canaux pr&eacute;f&eacute;r&eacute;s</label>
                      <input v-model="form.preferredChannels" placeholder="Ex: email, t&eacute;l&eacute;phone, LinkedIn" class="input-field text-xs" />
                    </div>
                    <div>
                      <label class="field-label">Contenu qui r&eacute;sonne</label>
                      <textarea v-model="form.contentPreferences" rows="2" placeholder="Ex: &Eacute;tudes de cas chiffr&eacute;es, comparatifs, t&eacute;moignages de pairs" class="input-field resize-none text-xs" />
                    </div>
                  </div>
                </fieldset>

                <!-- Section : Personas -->
                <fieldset>
                  <legend class="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold">4</span>
                    Personas
                    <span class="text-[10px] font-normal text-gray-400 normal-case tracking-normal ml-1">Repr&eacute;sentations visuelles de l'avatar</span>
                  </legend>

                  <div class="space-y-3">
                    <div
                      v-for="(persona, pi) in form.personas"
                      :key="pi"
                      class="border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3 relative group"
                    >
                      <button
                        type="button"
                        @click="form.personas.splice(pi, 1)"
                        class="absolute top-2 right-2 p-1 rounded-lg text-gray-400 hover:text-danger-500 hover:bg-danger-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Supprimer"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>

                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="field-label">Pr&eacute;nom</label>
                          <input v-model="persona.name" placeholder="Ex: Marc" class="input-field text-xs" />
                        </div>
                        <div>
                          <label class="field-label">Tranche d'&acirc;ge</label>
                          <input v-model="persona.ageRange" placeholder="Ex: 45-55 ans" class="input-field text-xs" />
                        </div>
                      </div>
                      <div>
                        <label class="field-label">Apparence physique</label>
                        <textarea v-model="persona.appearance" rows="2" placeholder="Ex: Homme trapu, mains de travailleur, tablier blanc, moustache" class="input-field resize-none text-xs" />
                      </div>
                      <div>
                        <label class="field-label">Character sheet</label>
                        <textarea v-model="persona.characterSheet" rows="3" placeholder="Ex: Boulanger artisan depuis 25 ans, passionn&eacute; par les viennoiseries aux amandes." class="input-field resize-none text-xs" />
                      </div>

                      <!-- Prompt Nano Banana -->
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          @click="showCharacterSheetPrompt(pi)"
                          class="text-[10px] px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium inline-flex items-center gap-1.5"
                        >
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                          Prompt Nano Banana
                        </button>
                        <span class="text-[10px] text-gray-400">G&eacute;n&egrave;re le prompt pour cr&eacute;er le character sheet 10 expressions</span>
                      </div>

                      <!-- Character Sheet Upload & Auto-slice -->
                      <div class="mt-2">
                        <label class="field-label">Planche d'expressions (character sheet)</label>
                        <div v-if="persona.characterSheetUrl" class="relative group/cs">
                          <img :src="persona.characterSheetUrl" class="w-full rounded-lg border border-gray-200 dark:border-slate-600 cursor-pointer" @click="triggerCharacterSheetUpload(pi)" />
                          <div class="absolute inset-0 bg-black/30 opacity-0 group-hover/cs:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <span class="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full">Remplacer &amp; red&eacute;couper</span>
                          </div>
                        </div>
                        <button
                          v-else
                          type="button"
                          @click="triggerCharacterSheetUpload(pi)"
                          :disabled="csSlicing"
                          class="w-full py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl text-xs text-gray-400 hover:border-amber-400 hover:text-amber-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <svg v-if="!csSlicing" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          {{ csSlicing ? 'D\u00e9coupe en cours\u2026' : 'Uploader la planche \u2014 d\u00e9coupe auto des 10 expressions' }}
                        </button>
                      </div>

                      <!-- Expressions faciales -->
                      <div class="mt-2 pt-3 border-t border-gray-100 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-2">
                          <label class="field-label mb-0">Expressions faciales</label>
                          <button
                            type="button"
                            @click="addExpression(pi)"
                            class="text-[10px] text-primary-600 hover:text-primary-700 font-semibold"
                          >+ Ajouter</button>
                        </div>
                        <div v-if="!persona.expressions?.length" class="text-[10px] text-gray-400 py-2">Aucune expression. Cliquez sur &laquo; + Ajouter &raquo;.</div>
                        <div v-else class="space-y-2">
                          <div
                            v-for="(expr, ei) in persona.expressions"
                            :key="ei"
                            class="flex items-start gap-3 bg-gray-50 dark:bg-slate-800 rounded-lg p-3 relative group/expr"
                          >
                            <!-- Image preview / upload -->
                            <div class="shrink-0">
                              <div
                                v-if="expr.imageUrl"
                                class="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 relative group/img cursor-pointer"
                                @click="triggerExprUpload(pi, ei)"
                              >
                                <img :src="expr.imageUrl" class="w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                  <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                                </div>
                              </div>
                              <button
                                v-else
                                type="button"
                                @click="triggerExprUpload(pi, ei)"
                                class="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
                              >
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                              </button>
                            </div>
                            <!-- Fields -->
                            <div class="flex-1 space-y-2 min-w-0">
                              <div class="grid grid-cols-2 gap-2">
                                <input v-model="expr.slug" placeholder="slug (ex: confiant)" class="input-field text-[11px] font-mono py-1.5" />
                                <input v-model="expr.label" placeholder="Label (ex: Confiant)" class="input-field text-[11px] py-1.5" />
                              </div>
                              <input v-model="expr.prompt" placeholder="Prompt visage (ex: sourire confiant, regard direct)" class="input-field text-[11px] py-1.5" />
                            </div>
                            <!-- Delete -->
                            <button
                              type="button"
                              @click="persona.expressions.splice(ei, 1)"
                              class="shrink-0 p-1 rounded text-gray-400 hover:text-danger-500 opacity-0 group-hover/expr:opacity-100 transition-all"
                            >
                              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      @click="addPersona"
                      class="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors font-medium flex items-center justify-center gap-1.5"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Ajouter un persona
                    </button>
                  </div>
                </fieldset>

                <!-- Section : Mapping Type → Expression -->
                <fieldset v-if="allExpressionSlugs.length">
                  <legend class="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-bold">5</span>
                    Mapping Type &rarr; Expression
                    <span class="text-[10px] font-normal text-gray-400 normal-case tracking-normal ml-1">Quelle expression pour quel type d'article</span>
                  </legend>
                  <div class="space-y-2">
                    <div v-for="pt in pageTypes" :key="pt.value" class="flex items-center gap-3">
                      <span class="text-xs w-28 shrink-0">{{ pt.icon }} {{ pt.label }}</span>
                      <select
                        :value="form.pageTypeExpressionMap[pt.value] || ''"
                        @change="form.pageTypeExpressionMap[pt.value] = ($event.target as HTMLSelectElement).value"
                        class="input-field text-[11px] py-1.5 flex-1"
                      >
                        <option value="">Par d&eacute;faut</option>
                        <option v-for="slug in allExpressionSlugs" :key="slug" :value="slug">{{ slug }}</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                <!-- Section : Top produits cibles -->
                <fieldset v-if="editingId">
                  <legend class="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">6</span>
                    Top produits cibles
                    <span class="text-[10px] font-normal text-gray-400 normal-case tracking-normal ml-1">Produits prioritaires pour cet avatar</span>
                  </legend>
                  <div class="space-y-2">
                    <div
                      v-for="(p, idx) in productsForm"
                      :key="idx"
                      class="border border-gray-200 dark:border-slate-700 rounded-xl p-3 space-y-2 relative group"
                    >
                      <button
                        type="button"
                        @click="productsForm.splice(idx, 1); reindexProducts()"
                        class="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-danger-500 opacity-0 group-hover:opacity-100"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">#{{ p.position }}</span>
                        <input
                          :value="productSearch[idx] ?? ''"
                          @input="onProductSearchInput(idx, ($event.target as HTMLInputElement).value)"
                          :placeholder="p.productName ? `${p.productName} (id ${p.idProduct})` : 'Rechercher un produit (nom, ref, id)…'"
                          class="input-field text-xs flex-1"
                        />
                      </div>
                      <div v-if="productSearchResults[idx]?.length" class="border border-gray-100 dark:border-slate-700 rounded-lg max-h-40 overflow-y-auto bg-gray-50 dark:bg-slate-800">
                        <button
                          v-for="cand in productSearchResults[idx]"
                          :key="cand.idProduct"
                          type="button"
                          @click="pickProduct(idx, cand)"
                          class="w-full text-left px-3 py-1.5 text-[11px] hover:bg-primary-50 hover:text-primary-700 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                        >
                          <span class="font-mono text-gray-400">[{{ cand.idProduct }}]</span>
                          <span v-if="cand.reference" class="text-gray-500">{{ cand.reference }}</span>
                          <span class="ml-1">{{ cand.name }}</span>
                        </button>
                      </div>
                      <textarea
                        v-model="p.reason"
                        rows="2"
                        placeholder="Pourquoi ce produit pour cet avatar ?"
                        class="input-field resize-none text-[11px]"
                      />
                    </div>
                    <button
                      v-if="productsForm.length < 10"
                      type="button"
                      @click="addProductTarget"
                      class="w-full py-2 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-500 hover:border-emerald-300 hover:text-emerald-600"
                    >+ Ajouter un produit</button>
                    <div class="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        @click="saveProducts"
                        :disabled="savingProducts"
                        class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >{{ savingProducts ? 'Enregistrement…' : 'Enregistrer les produits' }}</button>
                      <span v-if="productsSavedFlash" class="text-[10px] text-emerald-600 font-medium">✓ Sauvegardé</span>
                    </div>
                  </div>
                </fieldset>

                <!-- Geographic influence zones -->
                <fieldset v-if="editingId">
                  <legend class="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span class="w-5 h-5 rounded bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-bold">7</span>
                    Zones d'influence géographique
                    <span class="text-[10px] font-normal text-gray-400 normal-case tracking-normal ml-1">Cibler la prospection par région/dépt</span>
                  </legend>
                  <div class="space-y-2">
                    <div
                      v-for="(z, idx) in zonesForm"
                      :key="idx"
                      class="border border-gray-200 dark:border-slate-700 rounded-xl p-3 space-y-2 relative group"
                    >
                      <button
                        type="button"
                        @click="zonesForm.splice(idx, 1); reindexZones()"
                        class="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-danger-500 opacity-0 group-hover:opacity-100"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">#{{ z.position }}</span>
                        <select v-model="z.zoneType" class="input-field text-[11px] py-1.5 w-32">
                          <option value="region">Région</option>
                          <option value="departement">Département</option>
                          <option value="country">Pays</option>
                          <option value="city">Ville</option>
                        </select>
                        <input v-model="z.zoneCode" placeholder="Code" maxlength="16" class="input-field text-[11px] py-1.5 w-20 font-mono" />
                        <input v-model="z.zoneLabel" placeholder="Libellé" maxlength="96" class="input-field text-[11px] py-1.5 flex-1" />
                      </div>
                      <div class="flex items-center gap-2">
                        <label class="text-[10px] text-gray-500 shrink-0">Poids</label>
                        <input
                          v-model.number="z.weight"
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          class="flex-1"
                        />
                        <span class="text-[10px] font-bold w-8 text-right">{{ z.weight }}</span>
                      </div>
                      <textarea
                        v-model="z.reason"
                        rows="2"
                        placeholder="Pourquoi cette zone (proximité Rungis, densité métier, signal réel…)"
                        class="input-field resize-none text-[11px]"
                      />
                    </div>
                    <button
                      v-if="zonesForm.length < 20"
                      type="button"
                      @click="addZone"
                      class="w-full py-2 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-500 hover:border-sky-300 hover:text-sky-600"
                    >+ Ajouter une zone</button>
                    <div class="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        @click="saveZones"
                        :disabled="savingZones"
                        class="text-xs px-3 py-1.5 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50"
                      >{{ savingZones ? 'Enregistrement…' : 'Enregistrer les zones' }}</button>
                      <span v-if="zonesSavedFlash" class="text-[10px] text-sky-600 font-medium">✓ Sauvegardé</span>
                    </div>
                  </div>
                </fieldset>

                <p v-if="formError" class="text-sm text-danger-500">{{ formError }}</p>
              </form>

              <!-- Footer -->
              <div class="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex gap-3 shrink-0">
                <button @click="slideOpen = false" class="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
                <button @click="saveAvatar" :disabled="saving" class="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50">
                  {{ saving ? 'Enregistrement\u2026' : 'Enregistrer' }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Character Sheet Prompt Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="csPromptVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="csPromptVisible = false">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <header class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 class="font-bold text-gray-800 dark:text-slate-100 text-sm">Prompt Nano Banana — Character Sheet</h3>
                <p class="text-[10px] text-gray-400 mt-0.5">10 expressions, fond vert, grille 2&times;5. Copier et coller dans Nano Banana.</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="copyCharacterSheetPrompt"
                  class="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  :class="csPromptCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-500 text-white hover:bg-amber-600'"
                >
                  {{ csPromptCopied ? 'Copi&eacute; !' : 'Copier' }}
                </button>
                <button @click="csPromptVisible = false" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </header>
            <div class="flex-1 overflow-auto p-6">
              <textarea
                :value="csPromptText"
                readonly
                rows="30"
                class="w-full text-[11px] font-mono bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 resize-y focus:outline-none cursor-text select-all leading-relaxed"
                @focus="($event.target as HTMLTextAreaElement).select()"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm Delete -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="deleteTarget = null">
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="font-bold text-gray-800 dark:text-slate-100 mb-2">Supprimer cet avatar ?</h3>
            <p class="text-sm text-gray-500 mb-5">&laquo; {{ deleteTarget.name }} &raquo; sera d&eacute;sactiv&eacute;.</p>
            <div class="flex gap-3">
              <button @click="deleteTarget = null" class="flex-1 py-2 border rounded-xl text-sm">Annuler</button>
              <button @click="doDelete" class="flex-1 py-2 bg-danger-500 text-white rounded-xl text-sm font-semibold">Supprimer</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

// ── Types ────────────────────────────────────────────────────────────────────

interface Expression {
  slug:     string
  label:    string
  prompt:   string
  imageUrl: string
}

interface Persona {
  name:              string
  ageRange:          string
  appearance:        string
  characterSheet:    string
  characterSheetUrl: string
  expressions:       Expression[]
}

interface ProductTarget {
  idProduct:   number
  productName: string
  reference:   string
  position:    number
  reason:      string
}

interface GeographicZone {
  zoneType:  string
  zoneCode:  string
  zoneLabel: string
  position:  number
  weight:    number
  reason:    string
}

interface ProductCandidate {
  idProduct: number
  name:      string
  reference: string
}

interface AvatarDef {
  id:                 number
  name:               string
  slug:               string
  icon:               string
  colorClass:         string
  keywords:           string[]
  toneRules:          string
  buyingBehavior:     string
  painPoints:         string
  goals:              string
  objections:         string
  preferredChannels:  string
  budgetRange:        string
  decisionCycle:      string
  contentPreferences: string
  demographics:       string
  personas:                Persona[]
  pageTypeExpressionMap:   Record<string, string>
  active:                  boolean
  dateAdd:            string
  dateUpd:            string
  products?:          ProductTarget[]
  zones?:             GeographicZone[]
}

// ── Donn&eacute;es ───────────────────────────────────────────────────────────────────

const avatars  = ref<AvatarDef[]>([])
const loading  = ref(true)

async function loadAvatars() {
  loading.value = true
  try {
    const list = await $fetch<AvatarDef[]>('/api/hub/avatars')
    // Loads in parallel target products + geographic zones for each avatar
    await Promise.all(list.map(async (av) => {
      try {
        const [pr, zr] = await Promise.all([
          $fetch<{ items: ProductTarget[] }>(`/api/hub/avatars/${av.id}/products`).catch(() => ({ items: [] })),
          $fetch<{ items: GeographicZone[] }>(`/api/hub/avatars/${av.id}/zones`).catch(() => ({ items: [] })),
        ])
        av.products = pr.items || []
        av.zones    = zr.items || []
      } catch {
        av.products = []
        av.zones    = []
      }
    }))
    avatars.value = list
  } catch { avatars.value = [] }
  finally { loading.value = false }
}

/** Tailwind class for a geographic zone badge based on its weight 0-100 */
function zoneBadgeClass(weight: number): string {
  if (weight >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (weight >= 60) return 'bg-sky-50 text-sky-700 border-sky-200'
  if (weight >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-gray-50 text-gray-500 border-gray-200'
}

/** % of AI profile completeness (filled fields / total) */
function completeness(av: AvatarDef): number {
  const fields = [
    av.toneRules, av.buyingBehavior, av.painPoints, av.goals,
    av.objections, av.preferredChannels, av.budgetRange,
    av.decisionCycle, av.contentPreferences, av.demographics,
  ]
  const filled = fields.filter(f => f && f.trim()).length
  const hasPersonas = av.personas && av.personas.length > 0 ? 1 : 0
  return Math.round(((filled + hasPersonas) / (fields.length + 1)) * 100)
}

const pageTypes = [
  { value: 'guide', icon: '📘', label: 'Guide' },
  { value: 'comparatif', icon: '⚖️', label: 'Comparatif' },
  { value: 'astuces', icon: '💡', label: 'Astuces' },
  { value: 'actualite', icon: '📰', label: 'Actualité' },
  { value: 'test-produit', icon: '📝', label: 'Test produit' },
  { value: 'recette', icon: '🍳', label: 'Recette' },
]

/** All expression slugs defined in the form personas */
const allExpressionSlugs = computed(() => {
  const slugs = new Set<string>()
  for (const p of form.personas) {
    for (const e of (p.expressions || [])) {
      if (e.slug) slugs.add(e.slug)
    }
  }
  return [...slugs].sort()
})

function addPersona() {
  form.personas.push({
    name: '', ageRange: '', appearance: '',
    characterSheet: '', characterSheetUrl: '', expressions: [],
  })
}

function addExpression(personaIndex: number) {
  if (!form.personas[personaIndex].expressions) {
    form.personas[personaIndex].expressions = []
  }
  form.personas[personaIndex].expressions.push({
    slug: '', label: '', prompt: '', imageUrl: '',
  })
}

// Hidden file input for expression uploads
const exprUploadRef = ref<HTMLInputElement | null>(null)
const pendingUpload = ref<{ pi: number; ei: number } | null>(null)

function triggerExprUpload(pi: number, ei: number) {
  pendingUpload.value = { pi, ei }
  if (!exprUploadRef.value) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'
    input.addEventListener('change', handleExprUpload)
    document.body.appendChild(input)
    exprUploadRef.value = input
  }
  exprUploadRef.value.value = ''
  exprUploadRef.value.click()
}

async function handleExprUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !pendingUpload.value) return

  const { pi, ei } = pendingUpload.value
  const fd = new FormData()
  fd.append('file', file)
  fd.append('dest', 'avatars-expressions')

  try {
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload-image', {
      method: 'POST',
      body: fd,
    })
    if (res.success && res.url) {
      form.personas[pi].expressions[ei].imageUrl = res.url
    }
  } catch (err) {
    console.error('Upload expression error:', err)
  }
  pendingUpload.value = null
}

// ── Character Sheet Prompt Generator ─────────────────────────────────────────

const csPromptVisible = ref(false)
const csPromptText = ref('')
const csPromptCopied = ref(false)

// ── Character Sheet Upload & Auto-slice ──────────────────────────────────────

const csUploadRef = ref<HTMLInputElement | null>(null)
const pendingCsUpload = ref<number | null>(null)
const csSlicing = ref(false)

function triggerCharacterSheetUpload(pi: number) {
  pendingCsUpload.value = pi
  if (!csUploadRef.value) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'
    input.addEventListener('change', handleCsUpload)
    document.body.appendChild(input)
    csUploadRef.value = input
  }
  csUploadRef.value.value = ''
  csUploadRef.value.click()
}

async function handleCsUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || pendingCsUpload.value === null) return

  const pi = pendingCsUpload.value
  const persona = form.personas[pi]
  const personaSlug = (persona.name || form.slug || 'persona').toLowerCase().replace(/[^a-z0-9]+/g, '-')

  const fd = new FormData()
  fd.append('file', file)
  fd.append('persona', personaSlug)

  csSlicing.value = true
  try {
    const res = await $fetch<{
      success: boolean
      sheetUrl: string
      cells: { slug: string; url: string }[]
    }>('/api/admin/slice-character-sheet', {
      method: 'POST',
      body: fd,
    })

    if (res.success) {
      persona.characterSheetUrl = res.sheetUrl

      const exprLabels: Record<string, string> = {
        neutral: 'Neutre', happy: 'Content', thinking: 'R\u00e9fl\u00e9chit',
        concerned: 'Pr\u00e9occup\u00e9', excited: 'Enthousiaste', skeptical: 'Sceptique',
        curious: 'Curieux', determined: 'D\u00e9termin\u00e9', surprised: 'Surpris',
        contemplative: 'Contemplatif',
      }

      persona.expressions = res.cells.map(cell => {
        const existing = persona.expressions?.find(ex => ex.slug === cell.slug)
        return {
          slug: cell.slug,
          label: existing?.label || exprLabels[cell.slug] || cell.slug,
          prompt: existing?.prompt || '',
          imageUrl: cell.url,
        }
      })
    }
  } catch (err) {
    console.error('Upload & slice character sheet error:', err)
  }
  csSlicing.value = false
  pendingCsUpload.value = null
}

/** Standard 5-component descriptions for each expression (inspired by OUTIL_expressions.md) */
const EXPRESSION_DEFS: Record<string, { label: string; desc: string }> = {
  neutral: {
    label: 'NEUTRAL',
    desc: `Sourcils : position de repos, ni levés ni froncés.
Yeux : ouverts à la largeur naturelle, regard direct caméra.
Bouche : fermée, coins parfaitement équilibrés, ni sourire ni grimace.
Mâchoire : complètement déserrée, douce.
Qualité : présence sans intention. Professionnel au repos.`,
  },
  happy: {
    label: 'HAPPY',
    desc: `Sourcils : légèrement relevés, détendus, ouverts.
Yeux : plissés par le sourire, plis de joie aux coins (pattes d'oie), brillants.
Bouche : sourire franc, coins nettement relevés, dents légèrement visibles.
Mâchoire : détendue, ouverte par le sourire.
Qualité : fierté sincère, satisfaction du travail bien fait. Chaleureux.`,
  },
  thinking: {
    label: 'THINKING',
    desc: `Sourcils : légèrement froncés au centre, concentration douce.
Yeux : légèrement plissés, regard dirigé vers le bas-côté, intérieur.
Bouche : fermée, lèvres légèrement pincées, coins neutres.
Mâchoire : légèrement serrée, tension de réflexion.
Qualité : en train de résoudre un problème. Cerveau actif. Le professionnel qui calcule.`,
  },
  concerned: {
    label: 'CONCERNED',
    desc: `Sourcils : intérieur légèrement levé, extérieur bas. Asymétrie d'inquiétude.
Yeux : ouverts, regard scrutateur, légèrement resserrés.
Bouche : fermée, coins légèrement tirés vers le bas.
Mâchoire : serrée, tension contenue.
Qualité : quelque chose ne va pas. Alerte professionnelle. Pas de panique, du souci.`,
  },
  excited: {
    label: 'EXCITED',
    desc: `Sourcils : relevés, ouverts, énergie visible.
Yeux : grands ouverts, brillants, regard direct et intense.
Bouche : entrouverte en sourire contenu, lèvres écartées d'enthousiasme.
Mâchoire : légèrement décrochée par la surprise positive.
Qualité : découverte d'une opportunité. L'énergie du "eureka" professionnel.`,
  },
  skeptical: {
    label: 'SKEPTICAL',
    desc: `Sourcils : un sourcil nettement plus haut que l'autre (+4mm). Asymétrie marquée.
Yeux : le côté du sourcil levé légèrement plus ouvert, l'autre rétréci.
Bouche : fermée, coins neutres à légèrement tirés d'un côté. Moue subtile.
Mâchoire : serrée, position de jugement.
Qualité : pas convaincu. Évalue ce qu'on lui dit. Le professionnel qui ne gobe pas tout.`,
  },
  curious: {
    label: 'CURIOUS',
    desc: `Sourcils : légèrement levés, asymétriques — un sourcil 2-3mm plus haut.
Petit plissement entre les deux, concentration.
Yeux : légèrement plus ouverts que neutral, regard focalisé sur quelque chose
sous la caméra, comme s'il examinait. Pupils intenses.
Bouche : fermée, coins légèrement tirés vers l'intérieur. Retenu.
Mâchoire : légèrement serrée, vigilance calme.
Qualité : le cerveau vient de se mettre en route. Interne. Électrique.`,
  },
  determined: {
    label: 'DETERMINED',
    desc: `Sourcils : légèrement froncés au centre, tension de concentration.
Yeux : légèrement réduits, resserrés vers un point. Regard direct, visé.
Bouche : fermée, lèvres légèrement pressées. Coins tirés vers les côtés.
Mâchoire : serrée clairement, mais pas crispée.
Qualité : la décision est prise. Calme. Puissant. Sans drama.`,
  },
  surprised: {
    label: 'SURPRISED',
    desc: `Sourcils : franchement levés, symétriques, +4-5mm au-dessus du neutral.
Yeux : clairement plus ouverts que neutral, mais pas exorbités.
Blanc légèrement visible au-dessus de l'iris.
Bouche : entrouverte, 3-5mm maximum. Pas béante. Coins tirés.
Mâchoire : légèrement décrochée, relâchée par la surprise.
Qualité : quelque chose d'imprévu vient d'arriver. Suspendu. L'instant avant la réaction.`,
  },
  contemplative: {
    label: 'CONTEMPLATIVE',
    desc: `Sourcils : complètement relâchés, légèrement plus bas que neutral.
Yeux : légèrement réduits, plissés vers le bas, regard tourné vers l'intérieur.
Direction bas-côté, pas caméra directe.
Bouche : fermée, coins très légèrement relevés — pas un sourire,
juste le coin d'une compréhension.
Mâchoire : complètement relâchée.
Qualité : il vient de comprendre quelque chose. Profondeur. Le silence après un insight.`,
  },
}

function showCharacterSheetPrompt(personaIndex: number) {
  const persona = form.personas[personaIndex]
  if (!persona) return

  // Build the physical description from persona fields
  const physicalLines: string[] = []
  if (persona.ageRange) physicalLines.push(persona.ageRange)
  if (persona.appearance) physicalLines.push(persona.appearance)
  if (persona.characterSheet) physicalLines.push(persona.characterSheet)

  const charName = persona.name || form.name || 'Character'

  // Build expression blocks
  const exprOrder = ['neutral', 'happy', 'thinking', 'concerned', 'excited', 'skeptical', 'curious', 'determined', 'surprised', 'contemplative']
  const row1 = exprOrder.slice(0, 5)
  const row2 = exprOrder.slice(5)

  function formatExprBlock(slugs: string[], startIdx: number): string {
    return slugs.map((slug, i) => {
      const def = EXPRESSION_DEFS[slug]
      if (!def) return ''
      return `${startIdx + i + 1}. ${def.label}:\n${def.desc}`
    }).join('\n\n')
  }

  csPromptText.value = `Pixar 3D animation style, ultra-high quality render, cinematic lighting, subsurface scattering on skin, detailed fabric textures, expressive Pixar-proportioned characters with slightly enlarged eyes and stylized features. Photorealistic materials, sharp depth of field, professional color grading.

CHARACTER SHEET — 10 facial expressions on a SINGLE IMAGE.
Bright GREEN (#00FF00) chroma-key background. No gradient, no shadow on background.
Grid layout: 2 rows x 5 columns.

CRITICAL FRAMING — MEDIUM SHOT (PLAN TAILLE):
Each cell MUST show the character from the WAIST UP (not just the face!).
The frame MUST include: head, shoulders, chest, arms, hands, and waist.
Hands and arms MUST be visible and expressive — gesturing, holding tools, crossed, on chin, etc.
The character's professional accessories and clothing details MUST be clearly visible.
Each cell has a VERTICAL (portrait) aspect ratio — taller than wide.
DO NOT crop at the neck or shoulders. DO NOT show only the face.
Think of each cell as a portrait photo taken from 1.5 meters away.

CHARACTER: ${charName}
${physicalLines.join('\n')}

EXPRESSIONS (Row 1, left to right):

${formatExprBlock(row1, 0)}

EXPRESSIONS (Row 2, left to right):

${formatExprBlock(row2, 5)}

POSE DIRECTION PER EXPRESSION:
- NEUTRAL: hands relaxed at sides or resting on work surface
- HAPPY: one hand presenting something, open palm, or both hands visible in welcoming gesture
- THINKING: hand on chin or finger on temple, other arm crossed
- CONCERNED: arms crossed or hands gripping a document/tool
- EXCITED: both hands up slightly, palms open, leaning forward
- SKEPTICAL: arms crossed, one eyebrow raised, leaning back slightly
- CURIOUS: one hand reaching forward, leaning in, other hand on hip
- DETERMINED: fists lightly clenched at chest level, squared shoulders
- SURPRISED: hands raised at shoulder height, palms forward
- CONTEMPLATIVE: one hand holding an object (cup, tool), other hand resting, gaze averted

LIGHTING: Flat, even studio light. No dramatic shadows. No colored lighting.
BACKGROUND: Pure chroma-key green (#00FF00) for every cell. Solid, uniform.
CONSISTENCY: Same character in every cell — same clothes, same hair, same features. Only the facial expression and hand/arm pose changes.
LABELS: Print the expression name below each cell in small clean sans-serif text.

ORIGINAL FICTIONAL CHARACTER. NOT based on any real person, celebrity, or public figure.`

  csPromptCopied.value = false
  csPromptVisible.value = true
}

function copyCharacterSheetPrompt() {
  navigator.clipboard.writeText(csPromptText.value)
  csPromptCopied.value = true
  setTimeout(() => { csPromptCopied.value = false }, 2000)
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

const slideOpen    = ref(false)
const editingId    = ref<number | null>(null)
const saving       = ref(false)
const formError    = ref('')
const deleteTarget = ref<AvatarDef | null>(null)

const form = reactive({
  name:               '',
  slug:               '',
  icon:               '\ud83d\udc64',
  colorClass:         'bg-violet-100 text-violet-700',
  toneRules:          '',
  buyingBehavior:     '',
  painPoints:         '',
  goals:              '',
  objections:         '',
  preferredChannels:  '',
  budgetRange:        '',
  decisionCycle:      '',
  contentPreferences: '',
  demographics:       '',
  personas:                [] as Persona[],
  pageTypeExpressionMap:   {} as Record<string, string>,
})
const keywordsInput = ref('')

// Top target products + geographic zones (loaded at opening)
const productsForm = ref<ProductTarget[]>([])
const zonesForm    = ref<GeographicZone[]>([])
const savingProducts = ref(false)
const savingZones    = ref(false)
const productsSavedFlash = ref(false)
const zonesSavedFlash    = ref(false)
const productSearch        = ref<Record<number, string>>({})
const productSearchResults = ref<Record<number, ProductCandidate[]>>({})
let   productSearchTimer: ReturnType<typeof setTimeout> | null = null

function reindexProducts() {
  productsForm.value.forEach((p, i) => { p.position = i + 1 })
}
function reindexZones() {
  zonesForm.value.forEach((z, i) => { z.position = i + 1 })
}
function addProductTarget() {
  productsForm.value.push({ idProduct: 0, productName: '', reference: '', position: productsForm.value.length + 1, reason: '' })
}
function addZone() {
  zonesForm.value.push({ zoneType: 'region', zoneCode: '', zoneLabel: '', position: zonesForm.value.length + 1, weight: 50, reason: '' })
}

function onProductSearchInput(idx: number, q: string) {
  productSearch.value[idx] = q
  if (productSearchTimer) clearTimeout(productSearchTimer)
  if (!q || q.trim().length < 2) {
    productSearchResults.value[idx] = []
    return
  }
  productSearchTimer = setTimeout(async () => {
    try {
      const res = await $fetch<{ products: Array<{ id: number; name: string; ref: string }> }>('/api/catalogue/search', {
        query: { q: q.trim(), limit: 10 },
      })
      productSearchResults.value[idx] = (res.products || []).map((p) => ({
        idProduct: p.id, name: p.name, reference: p.ref,
      }))
    } catch {
      productSearchResults.value[idx] = []
    }
  }, 250)
}

function pickProduct(idx: number, cand: ProductCandidate) {
  productsForm.value[idx].idProduct   = cand.idProduct
  productsForm.value[idx].productName = cand.name
  productsForm.value[idx].reference   = cand.reference
  productSearch.value[idx]            = ''
  productSearchResults.value[idx]     = []
}

async function saveProducts() {
  if (!editingId.value) return
  savingProducts.value = true
  try {
    await $fetch(`/api/hub/avatars/${editingId.value}/products`, {
      method: 'PUT',
      body: {
        items: productsForm.value
          .filter((p) => p.idProduct > 0)
          .map((p) => ({ idProduct: p.idProduct, position: p.position, reason: p.reason })),
      },
    })
    productsSavedFlash.value = true
    setTimeout(() => { productsSavedFlash.value = false }, 2000)
    await loadAvatars()
  } catch (e: any) {
    formError.value = e.data?.message || 'Erreur enregistrement produits'
  } finally { savingProducts.value = false }
}

async function saveZones() {
  if (!editingId.value) return
  savingZones.value = true
  try {
    await $fetch(`/api/hub/avatars/${editingId.value}/zones`, {
      method: 'PUT',
      body: {
        items: zonesForm.value
          .filter((z) => z.zoneCode && z.zoneLabel)
          .map((z) => ({
            zoneType: z.zoneType, zoneCode: z.zoneCode, zoneLabel: z.zoneLabel,
            position: z.position, weight: z.weight, reason: z.reason,
          })),
      },
    })
    zonesSavedFlash.value = true
    setTimeout(() => { zonesSavedFlash.value = false }, 2000)
    await loadAvatars()
  } catch (e: any) {
    formError.value = e.data?.message || 'Erreur enregistrement zones'
  } finally { savingZones.value = false }
}

const parsedKeywords = computed(() =>
  keywordsInput.value.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
)

function resetForm() {
  form.name = ''; form.slug = ''; form.icon = '\ud83d\udc64'
  form.colorClass = 'bg-violet-100 text-violet-700'
  form.toneRules = ''; form.buyingBehavior = ''; form.painPoints = ''
  form.goals = ''; form.objections = ''; form.preferredChannels = ''
  form.budgetRange = ''; form.decisionCycle = ''; form.contentPreferences = ''
  form.demographics = ''
  form.personas = []
  form.pageTypeExpressionMap = {}
  keywordsInput.value = ''
  formError.value = ''
  productsForm.value = []
  zonesForm.value = []
  productSearch.value = {}
  productSearchResults.value = {}
}

function openCreate() {
  editingId.value = null
  resetForm()
  slideOpen.value = true
}

function openEdit(av: AvatarDef) {
  editingId.value         = av.id
  form.name               = av.name
  form.slug               = av.slug
  form.icon               = av.icon
  form.colorClass         = av.colorClass
  form.toneRules          = av.toneRules
  form.buyingBehavior     = av.buyingBehavior
  form.painPoints         = av.painPoints
  form.goals              = av.goals
  form.objections         = av.objections
  form.preferredChannels  = av.preferredChannels
  form.budgetRange        = av.budgetRange
  form.decisionCycle      = av.decisionCycle
  form.contentPreferences = av.contentPreferences
  form.demographics       = av.demographics
  form.personas           = (av.personas || []).map((p: any) => ({
    name: p.name || '', ageRange: p.ageRange || p.age_range || '',
    appearance: p.appearance || '',
    characterSheet: p.characterSheet || p.character_sheet || '',
    characterSheetUrl: p.characterSheetUrl || p.character_sheet_url || '',
    expressions: (p.expressions || []).map((e: any) => ({
      slug: e.slug || '', label: e.label || '',
      prompt: e.prompt || '', imageUrl: e.imageUrl || e.image_url || '',
    })),
  }))
  form.pageTypeExpressionMap = av.pageTypeExpressionMap || {}
  keywordsInput.value     = av.keywords.join(', ')
  formError.value         = ''
  slideOpen.value         = true

  // Pre-fills products + zones from already-loaded lists (or
  // reloads from the API if the avatar was just created / not yet populated)
  productsForm.value = (av.products ?? []).map((p) => ({ ...p }))
  zonesForm.value    = (av.zones ?? []).map((z) => ({ ...z }))
  productSearch.value = {}
  productSearchResults.value = {}
}

// Auto-slug
watch(() => form.name, (name) => {
  if (!editingId.value) {
    form.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
})

async function saveAvatar() {
  if (!form.name.trim() || !form.slug.trim()) {
    formError.value = 'Nom et slug requis'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body = {
      id:                 editingId.value ?? undefined,
      name:               form.name,
      slug:               form.slug,
      icon:               form.icon,
      colorClass:         form.colorClass,
      keywords:           parsedKeywords.value,
      toneRules:          form.toneRules,
      buyingBehavior:     form.buyingBehavior,
      painPoints:         form.painPoints,
      goals:              form.goals,
      objections:         form.objections,
      preferredChannels:  form.preferredChannels,
      budgetRange:        form.budgetRange,
      decisionCycle:      form.decisionCycle,
      contentPreferences: form.contentPreferences,
      demographics:       form.demographics,
      personas:                form.personas,
      pageTypeExpressionMap:   form.pageTypeExpressionMap,
    }
    await $fetch('/api/hub/avatars', {
      method: editingId.value ? 'PUT' : 'POST',
      body,
    })
    slideOpen.value = false
    await loadAvatars()
  } catch (e: any) {
    formError.value = e.data?.message || 'Erreur'
  } finally { saving.value = false }
}

function confirmDelete(av: AvatarDef) { deleteTarget.value = av }

async function doDelete() {
  if (!deleteTarget.value) return
  await $fetch('/api/hub/avatars', {
    method: 'DELETE',
    query: { id: deleteTarget.value.id },
  })
  deleteTarget.value = null
  await loadAvatars()
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(() => {
  loadAvatars()
})
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900;
}
.field-label {
  @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5;
}
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
