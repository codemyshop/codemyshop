<template>
  <div class="flex-1 overflow-auto bg-gray-50">

    <!-- Header -->
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Config Système</h1>
          <p class="text-xs text-gray-400 mt-0.5">Clés API, état des modules et raccourcis</p>
        </div>
        <button
          @click="reload"
          :class="loading ? 'animate-spin' : ''"
          class="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>
    </header>

    <div class="p-6 max-w-5xl mx-auto space-y-6">

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- SECTION 1 : API Keys                                              -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Clés API</h2>
            <p class="text-xs text-gray-400 mt-0.5">PrestaShop Webservice &amp; Intelligence Artificielle</p>
          </div>
          <span v-if="apiKeys.updatedAt" class="text-[10px] text-gray-400">
            Modifié le {{ new Date(apiKeys.updatedAt).toLocaleDateString('fr-FR') }}
          </span>
        </div>

        <form @submit.prevent="saveKeys" class="px-6 py-5 space-y-6">

          <!-- PrestaShop API -->
          <fieldset class="space-y-4">
            <legend class="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              PrestaShop Webservice
              <span v-if="apiKeys.envPsKeySet" class="text-[10px] font-normal text-success-600 bg-success-50 px-1.5 py-0.5 rounded-full normal-case">
                .env configuré
              </span>
            </legend>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">URL de l'API Webservice</label>
              <input
                v-model="keyForm.prestashopUrl"
                type="url"
                placeholder="https://votre-boutique.com/api"
                class="input-field font-mono text-xs"
              />
              <p class="text-[10px] text-gray-400 mt-1">
                Votre BO PrestaShop &rarr; Paramètres avancés &rarr; Webservice. Format : https://domaine.com/api
              </p>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Clé Webservice
                <span v-if="psKeyExists" class="ml-2 text-[10px] font-semibold text-success-600 bg-success-50 px-1.5 py-0.5 rounded-full">
                  {{ apiKeys.prestashopKey }}
                </span>
              </label>
              <div class="relative">
                <input
                  v-model="keyForm.prestashopKey"
                  type="password"
                  :type="showPsKey ? 'text' : 'password'"
                  :placeholder="psKeyExists ? 'Laisser vide pour conserver la clé actuelle' : 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'"
                  class="input-field font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  @click="showPsKey = !showPsKey"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg v-if="showPsKey" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </button>
              </div>
              <p class="text-[10px] text-gray-400 mt-1">
                Permissions requises : products (GET), categories (GET), images (GET), combinations (GET)
              </p>
            </div>
          </fieldset>

          <div class="border-t border-gray-100 dark:border-slate-800" />

          <!-- IA API -->
          <fieldset class="space-y-4">
            <legend class="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              Intelligence Artificielle
              <span v-if="apiKeys.envAiKeySet" class="text-[10px] font-normal text-success-600 bg-success-50 px-1.5 py-0.5 rounded-full normal-case">
                .env configuré
              </span>
            </legend>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Provider</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="keyForm.aiProvider = 'anthropic'"
                  :class="[
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                    keyForm.aiProvider === 'anthropic'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 hover:border-gray-300',
                  ]"
                >
                  <span class="text-lg">🤖</span>
                  Anthropic (Claude)
                </button>
                <button
                  type="button"
                  @click="keyForm.aiProvider = 'openai'"
                  :class="[
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                    keyForm.aiProvider === 'openai'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 hover:border-gray-300',
                  ]"
                >
                  <span class="text-lg">🧠</span>
                  OpenAI (GPT)
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Clé API {{ keyForm.aiProvider === 'openai' ? 'OpenAI' : 'Anthropic' }}
                <span v-if="aiKeyExists" class="ml-2 text-[10px] font-semibold text-success-600 bg-success-50 px-1.5 py-0.5 rounded-full">
                  {{ apiKeys.aiApiKey }}
                </span>
              </label>
              <div class="relative">
                <input
                  v-model="keyForm.aiApiKey"
                  type="password"
                  :type="showAiKey ? 'text' : 'password'"
                  :placeholder="aiKeyExists ? 'Laisser vide pour conserver la clé actuelle' : (keyForm.aiProvider === 'openai' ? 'sk-proj-...' : 'sk-ant-api03-...')"
                  class="input-field font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  @click="showAiKey = !showAiKey"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg v-if="showAiKey" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Modèle</label>
              <select v-model="keyForm.aiModel" class="input-field text-xs">
                <optgroup label="Anthropic">
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (recommandé)</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (rapide, économique)</option>
                  <option value="claude-opus-4-6">Claude Opus 4.6 (premium)</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (économique)</option>
                </optgroup>
              </select>
            </div>
          </fieldset>

          <!-- Google Search Console -->
          <fieldset class="space-y-4">
            <legend class="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
              Google Search Console
            </legend>

            <!-- GSC site URL (per tenant) — visible to all tenant admins -->
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                URL du site dans GSC
                <span v-if="gscSiteUrl" class="ml-2 text-[10px] font-semibold text-success-600 bg-success-50 dark:bg-success-500/15 px-1.5 py-0.5 rounded-full">
                  {{ gscSiteUrl }}
                </span>
              </label>
              <input
                v-model="keyForm.gscSiteUrl"
                type="text"
                placeholder="https://example-shop.com/   ou   sc-domain:example-shop.com"
                class="input-field font-mono text-xs"
              />
              <p class="text-[10px] text-gray-500 dark:text-slate-500 mt-1">
                Format exact tel qu'enregistré dans Search Console (avec le slash final pour les URL preneuses, ou préfixe <code>sc-domain:</code>).
              </p>
            </div>

            <!-- JSON Service Account (global) — reserved for SaaS super admins -->
            <div v-if="isSuperAdmin" class="border-t border-gray-100 dark:border-slate-800 pt-4">
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                JSON Service Account (global AC)
                <span v-if="gscSaExists" class="ml-2 text-[10px] font-semibold text-success-600 bg-success-50 dark:bg-success-500/15 px-1.5 py-0.5 rounded-full">
                  {{ gscSaEmail || 'Configuré' }}
                </span>
                <span v-else class="ml-2 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/15 px-1.5 py-0.5 rounded-full">
                  Non configuré
                </span>
              </label>
              <textarea
                v-model="keyForm.gscServiceAccountJson"
                rows="4"
                :placeholder="gscSaExists ? 'Laisser vide pour conserver le JSON actuel' : 'Collez le JSON complet du Service Account (1 seul pour tout AC)'"
                class="input-field font-mono text-[11px]"
              />
              <p class="text-[10px] text-gray-500 dark:text-slate-500 mt-1">
                <strong>Une seule clé pour tous les tenants AC.</strong> Stockée chiffrée AES-256-GCM dans <code>cs_client_config[_global]</code>.
                Propagée automatiquement dans toutes les DBs tenants.
                Ajoutez l'email de service comme utilisateur de chaque property GSC tenant.
              </p>

              <!-- Propagation result after save -->
              <div v-if="gscPropagation" class="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 space-y-1">
                <p class="text-[10px] font-semibold text-gray-600 dark:text-slate-300">Propagation cross-DB :</p>
                <ul class="text-[10px] font-mono space-y-0.5">
                  <li v-for="db in gscPropagation.written" :key="'ok-' + db" class="text-success-600">✓ {{ db }}</li>
                  <li v-for="f in gscPropagation.failed" :key="'ko-' + f.db" class="text-danger-600">✗ {{ f.db }} — {{ f.error }}</li>
                </ul>
              </div>
            </div>
          </fieldset>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-2">
            <p v-if="keySaveStatus === 'ok'" class="text-xs text-success-600 font-semibold flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
              Clés sauvegardées
            </p>
            <p v-else-if="keySaveStatus === 'error'" class="text-xs text-danger-500 font-semibold">Erreur lors de la sauvegarde</p>
            <span v-else />
            <button
              type="submit"
              :disabled="keySaving"
              class="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              <svg v-if="keySaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Sauvegarder les clés
            </button>
          </div>
        </form>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- SECTION 2 : Module status (existing)                           -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="n in 3" :key="n" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 animate-pulse">
          <div class="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 mb-3" />
          <div class="h-4 bg-gray-100 dark:bg-slate-800 rounded w-2/3 mb-2" />
          <div class="h-3 bg-gray-50 rounded w-1/2" />
        </div>
      </div>

      <template v-else-if="status">

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

          <!-- Module IA -->
          <div class="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-5"
               :class="status.ai.hasApiKey ? 'border-violet-200' : 'border-amber-200'">
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   :class="status.ai.hasApiKey ? 'bg-violet-100' : 'bg-amber-50'">
                <svg class="w-5 h-5" :class="status.ai.hasApiKey ? 'text-violet-600' : 'text-amber-500'"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                    :class="status.ai.hasApiKey ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'">
                <span class="w-1.5 h-1.5 rounded-full" :class="status.ai.hasApiKey ? 'bg-violet-500 animate-pulse' : 'bg-amber-400'" />
                {{ status.ai.hasApiKey ? 'Actif' : 'Stub' }}
              </span>
            </div>
            <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">Module IA</h3>
            <p class="text-xs text-gray-400 mb-3">{{ status.ai.model }}</p>
            <dl class="space-y-1.5 text-xs">
              <div class="flex justify-between">
                <dt class="text-gray-400">Mode</dt>
                <dd class="font-semibold text-gray-700 dark:text-slate-200 capitalize">{{ status.ai.mode }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-400">Source</dt>
                <dd class="font-mono text-gray-500">{{ status.ai.sourceType }}</dd>
              </div>
            </dl>
          </div>

          <!-- Module Avatars -->
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 shadow-sm p-5">
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Actif
              </span>
            </div>
            <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">Module Avatars</h3>
            <p class="text-xs text-gray-400 mb-3">{{ status.avatars.total }} profils en cache</p>
            <div v-if="status.avatars.total > 0" class="space-y-1.5">
              <div v-for="(count, type) in status.avatars.distribution" :key="type" class="flex items-center gap-2">
                <span class="text-[11px] text-gray-500 w-28 truncate">{{ AVATAR_META[type as AvatarType]?.icon ?? '' }} {{ AVATAR_META[type as AvatarType]?.label ?? type }}</span>
                <div class="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div class="h-1.5 rounded-full bg-blue-400 transition-all" :style="`width: ${Math.round((count / status.avatars.total) * 100)}%`" />
                </div>
                <span class="text-[11px] font-semibold text-gray-600 w-5 text-right">{{ count }}</span>
              </div>
            </div>
          </div>

          <!-- Module Broadcast -->
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-green-200 shadow-sm p-5">
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 0 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535" />
                </svg>
              </div>
              <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500" />
                3 canaux
              </span>
            </div>
            <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">Broadcast Center</h3>
            <p class="text-xs text-gray-400 mb-3">Email + WhatsApp + SMS</p>
            <dl class="space-y-1.5 text-xs">
              <div class="flex justify-between"><dt class="text-gray-400">Email</dt><dd class="text-success-600 font-semibold">Actif</dd></div>
              <div class="flex justify-between"><dt class="text-gray-400">WhatsApp</dt><dd class="text-success-600 font-semibold">Actif</dd></div>
              <div class="flex justify-between"><dt class="text-gray-400">SMS</dt><dd class="text-success-600 font-semibold">Actif</dd></div>
            </dl>
          </div>

        </div>

        <p class="text-[10px] text-gray-300 text-right">
          {{ new Date(status.checkedAt).toLocaleTimeString('fr-FR') }}
        </p>
      </template>

      <div v-else-if="error" class="bg-danger-50 border border-danger-200 rounded-xl p-6 text-center">
        <p class="text-sm font-semibold text-danger-600 mb-1">Impossible de charger le statut</p>
        <p class="text-xs text-danger-400">{{ error }}</p>
        <button @click="reload" class="mt-3 text-xs text-danger-600 hover:underline">Réessayer</button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { AVATAR_META } from '~/utils/avatar'
import type { AvatarType } from '~/types/avatar'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { resolvedClientId } = useClientDetection()

// ── System status ─────────────────────────────────────────────────────────────

interface SystemStatus {
  ai: { mode: string; hasApiKey: boolean; sourceType: string; clientId: string; model: string }
  avatars: { total: number; distribution: Record<string, number>; storageDriver: string; storagePath: string }
  newsletter: { provider: string; status: string }
  checkedAt: string
}

const status  = ref<SystemStatus | null>(null)
const loading = ref(true)
const error   = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value   = null
  try {
    status.value = await $fetch<SystemStatus>('/api/hub/system-status')
  } catch (e: any) {
    error.value = e?.message ?? 'Erreur inconnue'
  } finally {
    loading.value = false
  }
}

async function reload() { await load(); await loadKeys() }

// ── API Keys ──────────────────────────────────────────────────────────────────

interface ApiKeysResponse {
  prestashopUrl: string
  prestashopKey: string   // masqué (sk-a••••8f3a)
  aiProvider:    string
  aiApiKey:      string   // masqué
  aiModel:       string
  updatedAt:     string | null
  hasPsKey:      boolean
  hasAiKey:      boolean
  envPsKeySet:   boolean
  envAiKeySet:   boolean
}

const apiKeys = ref<ApiKeysResponse>({
  prestashopUrl: '', prestashopKey: '', aiProvider: 'anthropic',
  aiApiKey: '', aiModel: 'claude-sonnet-4-6', updatedAt: null,
  hasPsKey: false, hasAiKey: false, envPsKeySet: false, envAiKeySet: false,
})

const keyForm = reactive({
  prestashopUrl: '',
  prestashopKey: '',   // vide = ne pas toucher la clé existante
  aiProvider:    'anthropic',
  aiApiKey:      '',   // vide = ne pas toucher
  aiModel:       'claude-sonnet-4-6',
  gscSiteUrl:    '',   // tenant-scope, cs_client_config.gscSiteUrl
  gscServiceAccountJson: '',  // global AC, _global.secrets.gscServiceAccount (admin SaaS only)
})

// Existing keys are NEVER pre-filled in the form — only indicators
const psKeyExists  = ref(false)
const aiKeyExists  = ref(false)
const gscSiteUrl   = ref('')           // siteUrl tenant courant (affichage)
const gscSaExists  = ref(false)        // SA global présent ?
const gscSaEmail   = ref<string | null>(null)
const isSuperAdmin = ref(false)        // accès SA global (root@/founder@/contact@)
const gscPropagation = ref<{ written: string[]; failed: { db: string; error: string }[] } | null>(null)

const showPsKey    = ref(false)
const showAiKey    = ref(false)
const keySaving    = ref(false)
const keySaveStatus = ref<'idle' | 'ok' | 'error'>('idle')

async function loadKeys() {
  try {
    const data = await $fetch<ApiKeysResponse>('/api/hub/api-keys', {
      query: { clientId: resolvedClientId.value },
    })
    apiKeys.value = data
    keyForm.prestashopUrl = data.prestashopUrl
    keyForm.prestashopKey = ''   // JAMAIS pré-rempli — le masque reste côté serveur
    keyForm.aiProvider    = data.aiProvider
    keyForm.aiApiKey      = ''   // JAMAIS pré-rempli
    keyForm.aiModel       = data.aiModel
    psKeyExists.value     = data.hasPsKey
    aiKeyExists.value     = data.hasAiKey
  } catch {
    //
  }

  // siteUrl GSC tenant
  try {
    const seo = await $fetch<{ gscSiteUrl: string }>('/api/hub/seo-config', {
      query: { clientId: resolvedClientId.value },
    })
    gscSiteUrl.value      = seo.gscSiteUrl ?? ''
    keyForm.gscSiteUrl    = gscSiteUrl.value
  } catch {}

  // Global Service Account (silently skipped if not SaaS super admin — 403)
  try {
    const sa = await $fetch<{ gscServiceAccount: { exists: boolean; email: string | null } }>(
      '/api/hub/global-secrets',
    )
    gscSaExists.value  = sa.gscServiceAccount.exists
    gscSaEmail.value   = sa.gscServiceAccount.email
    isSuperAdmin.value = true
  } catch {
    isSuperAdmin.value = false
  }
}

async function saveKeys() {
  keySaving.value    = true
  keySaveStatus.value = 'idle'
  try {
    // 1. API Keys (PS + AI) — legacy endpoint
    await $fetch('/api/hub/api-keys', {
      method: 'POST',
      body: {
        clientId:       resolvedClientId.value,
        prestashopUrl:  keyForm.prestashopUrl,
        prestashopKey:  keyForm.prestashopKey || undefined,
        aiProvider:     keyForm.aiProvider,
        aiApiKey:       keyForm.aiApiKey || undefined,
        aiModel:        keyForm.aiModel,
      },
    })

    // 2. siteUrl GSC tenant (DB cs_client_config)
    if (keyForm.gscSiteUrl !== gscSiteUrl.value) {
      await $fetch('/api/hub/seo-config', {
        method: 'POST',
        body: {
          clientId:   resolvedClientId.value,
          gscSiteUrl: keyForm.gscSiteUrl,
        },
      })
    }

    // 3. Global JSON Service Account (SaaS super admin only) — only if not empty
    if (isSuperAdmin.value && keyForm.gscServiceAccountJson.trim()) {
      const result = await $fetch<{
        propagation?: { written: string[]; failed: { db: string; error: string }[] }
      }>('/api/hub/global-secrets', {
        method: 'POST',
        body: { gscServiceAccountJson: keyForm.gscServiceAccountJson.trim() },
      })
      if (result.propagation) {
        gscPropagation.value = result.propagation
      }
    }

    keyForm.gscServiceAccountJson = ''  // ne pas garder en mémoire
    keySaveStatus.value = 'ok'
    await loadKeys()
    setTimeout(() => { keySaveStatus.value = 'idle' }, 3000)
  } catch {
    keySaveStatus.value = 'error'
  } finally {
    keySaving.value = false
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(() => {
  load()
  loadKeys()
})
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-slate-900;
}
</style>
