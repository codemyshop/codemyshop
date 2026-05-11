<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Leads & Contacts</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total }} leads</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button @click="setSource('')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="source === '' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">Tous</button>
          <button @click="setSource('lead')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="source === 'lead' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">Leads</button>
          <button @click="setSource('contact')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="source === 'contact' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">Formulaire</button>
        </div>
        <input v-model="search" type="text" placeholder="Nom, email, société…" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Rechercher</button>
        <a
          href="/api/bo/leads/export"
          download
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Télécharger tous les leads (CSV)"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Exporter
        </a>
        <button
          @click="importOpen = true"
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Importer des leads depuis un CSV"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
          Importer
        </button>
        <button
          @click="capaModalOpen = true"
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Configurer le scoring Capa pour ce tenant"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Capa
        </button>
        <button @click="showCreate = true" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouveau lead
        </button>
      </div>
    </header>

    
    <nav class="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 px-6 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
      <span class="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400 mr-2 shrink-0">Enrichir (gratuit)</span>
      <button
        v-for="src in enrichmentSources"
        :key="src.key"
        @click="openEnrichment(src.key)"
        class="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 shrink-0 border"
        :class="src.available
          ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'"
        :title="src.tagline"
      >
        <span class="text-base leading-none">{{ src.icon }}</span>
        <span>{{ src.label }}</span>
        <span v-if="!src.available" class="text-[9px] uppercase text-gray-400 ml-0.5">·&nbsp;todo</span>
      </button>
    </nav>

    
    <div
      v-if="enrichmentOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="enrichmentOpen = false"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div class="flex items-start gap-3">
          <span class="text-3xl leading-none">{{ currentSource?.icon }}</span>
          <div class="flex-1">
            <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ currentSource?.label }}</h2>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{{ currentSource?.tagline }}</p>
          </div>
          <span
            class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
            :class="currentSource?.available
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-500'"
          >{{ currentSource?.available ? 'Dispo' : 'À coder' }}</span>
        </div>
        <dl class="text-xs space-y-2">
          <div class="flex gap-2">
            <dt class="font-medium text-gray-500 w-32 shrink-0">Coût</dt>
            <dd class="text-gray-700 dark:text-slate-200">{{ currentSource?.cost }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="font-medium text-gray-500 w-32 shrink-0">Couverture</dt>
            <dd class="text-gray-700 dark:text-slate-200">{{ currentSource?.coverage }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="font-medium text-gray-500 w-32 shrink-0">Légal</dt>
            <dd class="text-gray-700 dark:text-slate-200">{{ currentSource?.legal }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="font-medium text-gray-500 w-32 shrink-0">Méthode</dt>
            <dd class="text-gray-700 dark:text-slate-200">{{ currentSource?.method }}</dd>
          </div>
          <div v-if="currentSource?.docUrl" class="flex gap-2">
            <dt class="font-medium text-gray-500 w-32 shrink-0">Doc</dt>
            <dd>
              <a :href="currentSource.docUrl" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">{{ currentSource.docUrl }}</a>
            </dd>
          </div>
        </dl>
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button @click="enrichmentOpen = false" class="text-xs px-3 py-1.5 bg-white border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">Fermer</button>
          <button
            :disabled="!currentSource?.available"
            class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            :title="currentSource?.available ? 'Lancer l\'enrichissement' : 'Scraper pas encore codé'"
          >{{ currentSource?.available ? 'Lancer' : 'Bientôt' }}</button>
        </div>
      </div>
    </div>

    <HubImportModal
      :open="importOpen"
      title="Importer des leads"
      subtitle="CSV — UPSERT par email. Crée ou met à jour uniquement la fiche lead (cs_smartlead)."
      endpoint="/api/bo/leads/import"
      :target-fields="importTargetFields"
      :field-aliases="importFieldAliases"
      :matching-keys="['email']"
      create-missing-label="Créer les leads manquants"
      create-missing-hint="Insère un nouveau lead si l'email n'existe pas encore. Statut par défaut : new, source : import."
      @close="importOpen = false"
      @done="load"
    />

    
    <HubCreateModal v-model="showCreate" title="Nouveau lead" :loading="creating" @submit="createLead">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs font-medium text-gray-500 mb-1">Prénom</label><input v-model="newLead.firstname" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
          <div><label class="block text-xs font-medium text-gray-500 mb-1">Nom</label><input v-model="newLead.lastname" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        </div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Email</label><input v-model="newLead.email" type="email" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Société</label><input v-model="newLead.company" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Téléphone</label><input v-model="newLead.phone" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <p v-if="createError" class="text-xs text-red-500">{{ createError }}</p>
      </div>
    </HubCreateModal>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="leads"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    
    <div
      v-if="selection.size > 0"
      class="bg-primary-50 dark:bg-primary-950/40 border-b border-primary-200 dark:border-primary-800 px-6 py-2 flex items-center gap-3 shrink-0"
    >
      <span class="text-xs font-medium text-primary-700 dark:text-primary-300">
        {{ selection.size }} sélectionné{{ selection.size > 1 ? 's' : '' }}
      </span>
      <button
        @click="exportSelectionCsv"
        class="text-xs px-3 py-1 bg-white dark:bg-slate-900 border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/40 flex items-center gap-1"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
        Exporter CSV
      </button>
      <button
        @click="openBulkVerify"
        :disabled="!selectionEmailCount"
        class="text-xs px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        :title="selectionEmailCount ? `Sondage SMTP sur ${selectionEmailCount} email(s)` : 'Aucun email à vérifier dans la sélection'"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
        Vérifier emails<span v-if="selectionEmailCount" class="opacity-80">&nbsp;({{ selectionEmailCount }})</span>
      </button>
      <button
        @click="bulkDeleteOpen = true"
        class="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
        Supprimer
      </button>
      <button
        @click="clearSelection"
        class="text-xs px-3 py-1 text-primary-700 dark:text-primary-300 hover:underline ml-auto"
      >
        Désélectionner
      </button>
    </div>

    
    <div
      v-if="bulkDeleteOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="bulkDeleteOpen = false"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">Supprimer {{ selection.size }} fiche{{ selection.size > 1 ? 's' : '' }} ?</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Action irréversible (sauf soft-delete des comptes boutique).
            Leads atlas et messages de contact : suppression définitive.
            Comptes boutique : voir le mode ci-dessous — leurs commandes
            sont toujours préservées pour archive.
          </p>
          <ul class="text-xs text-gray-600 dark:text-slate-300 mt-3 space-y-0.5 pl-1">
            <li v-if="selectionCounts.lead">• <b>{{ selectionCounts.lead }}</b> lead{{ selectionCounts.lead > 1 ? 's' : '' }} atlas</li>
            <li v-if="selectionCounts.contact">• <b>{{ selectionCounts.contact }}</b> message{{ selectionCounts.contact > 1 ? 's' : '' }} de contact</li>
            <li v-if="selectionCounts.customerNoorder">• <b>{{ selectionCounts.customerNoorder }}</b> compte{{ selectionCounts.customerNoorder > 1 ? 's' : '' }} boutique</li>
          </ul>
        </div>

        
        <div v-if="selectionCounts.customerNoorder" class="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2">
          <p class="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
            Mode pour {{ selectionCounts.customerNoorder }} compte{{ selectionCounts.customerNoorder > 1 ? 's' : '' }} boutique
          </p>
          <label class="flex items-start gap-2 text-xs text-gray-700 dark:text-slate-200 cursor-pointer">
            <input v-model="bulkDeleteMode" type="radio" value="soft" class="mt-0.5" />
            <span>
              <b>Soft</b> — compte marqué supprimé (deleted=1).
              L'email redevient libre, le client peut se réinscrire.
              <span class="text-emerald-600 dark:text-emerald-400">Recommandé.</span>
            </span>
          </label>
          <label class="flex items-start gap-2 text-xs text-gray-700 dark:text-slate-200 cursor-pointer">
            <input v-model="bulkDeleteMode" type="radio" value="hard" class="mt-0.5" />
            <span>
              <b>Hard</b> — RGPD : DELETE complet du compte + adresses non commandées,
              carts pending, sessions. Les commandes restent pour archive.
              <span class="text-red-600 dark:text-red-400">Irréversible.</span>
            </span>
          </label>
        </div>

        <p v-if="bulkDeleteError" class="text-xs text-red-500">{{ bulkDeleteError }}</p>
        <div class="flex justify-end gap-2">
          <button @click="bulkDeleteOpen = false" class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
          <button @click="submitBulkDelete" :disabled="bulkDeleting" class="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{{ bulkDeleting ? 'Suppression…' : 'Confirmer la suppression' }}</button>
        </div>
      </div>
    </div>

    
    <div
      v-if="bulkVerifyOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeBulkVerify"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">Vérification SMTP en lot</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Sondage RCPT TO sur <b>{{ bulkVerifyTotal }}</b> email{{ bulkVerifyTotal > 1 ? 's' : '' }}
            (concurrence 3, ~3-5 s par email). Tu peux interrompre à tout moment.
          </p>
        </div>

        
        <div v-if="bulkVerifyRunning || bulkVerifyDone > 0" class="space-y-1.5">
          <div class="flex justify-between text-[11px] text-gray-600 dark:text-slate-300 font-mono">
            <span>{{ bulkVerifyDone }} / {{ bulkVerifyTotal }}</span>
            <span>{{ bulkVerifyTotal ? Math.round(100 * bulkVerifyDone / bulkVerifyTotal) : 0 }} %</span>
          </div>
          <div class="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-500 transition-all duration-200"
              :style="{ width: bulkVerifyTotal ? (100 * bulkVerifyDone / bulkVerifyTotal) + '%' : '0%' }"
            />
          </div>
        </div>

        
        <div v-if="bulkVerifyDone > 0" class="grid grid-cols-3 gap-2 text-[11px]">
          <div class="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-1.5 text-center">
            <div class="font-semibold text-base leading-tight">{{ bulkVerifyCounts.ok }}</div>
            <div class="opacity-70">Vérifiés</div>
          </div>
          <div class="rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-2 py-1.5 text-center">
            <div class="font-semibold text-base leading-tight">{{ bulkVerifyCounts.rejected }}</div>
            <div class="opacity-70">Rejetés</div>
          </div>
          <div class="rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-2 py-1.5 text-center">
            <div class="font-semibold text-base leading-tight">{{ bulkVerifyCounts.unknown + bulkVerifyCounts.errors }}</div>
            <div class="opacity-70">Inconcluants</div>
          </div>
        </div>

        
        <p v-if="bulkVerifyRunning && bulkVerifyCurrent" class="text-[11px] text-gray-500 dark:text-slate-400 truncate">
          En cours : {{ bulkVerifyCurrent }}
        </p>

        <p v-if="bulkVerifyError" class="text-xs text-red-500">{{ bulkVerifyError }}</p>

        <div class="flex justify-end gap-2">
          <button
            v-if="!bulkVerifyRunning && bulkVerifyDone === 0"
            @click="closeBulkVerify"
            class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
          >Annuler</button>
          <button
            v-if="bulkVerifyRunning"
            @click="bulkVerifyShouldStop = true"
            class="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >Interrompre</button>
          <button
            v-if="!bulkVerifyRunning && bulkVerifyDone === 0"
            @click="runBulkVerify"
            class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >Lancer la vérification</button>
          <button
            v-if="!bulkVerifyRunning && bulkVerifyDone > 0"
            @click="closeBulkVerify"
            class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >Fermer</button>
        </div>
      </div>
    </div>

    
    <div
      v-if="linkedinLead"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeLinkedinModal"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            LinkedIn
            <span v-if="linkedinLead.linkedinUrl" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold uppercase tracking-wider">Vérifié</span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {{ linkedinLead.name }}<span v-if="linkedinLead.company"> · {{ linkedinLead.company }}</span>
          </p>
        </div>

        
        <div class="border border-gray-100 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Étape 1 — Trouver le profil</p>
          <a
            v-if="linkedinSearchUrl(linkedinLead)"
            :href="linkedinSearchUrl(linkedinLead)!"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            Rechercher sur Google (site:linkedin.com/in/)
          </a>
          <p v-else class="text-xs text-gray-400">Nom incomplet — recherche indisponible.</p>
        </div>

        
        <div class="border border-gray-100 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Étape 2 — Coller l'URL du profil vérifié</p>
          <input
            v-model="linkedinUrlInput"
            type="url"
            placeholder="https://www.linkedin.com/in/…"
            class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2"
            @keyup.enter="submitLinkedin"
          />
          <a
            v-if="linkedinUrlInput && /^https?:\/\/.+linkedin\.com\//i.test(linkedinUrlInput)"
            :href="linkedinUrlInput"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-[11px] text-primary-600 hover:underline"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            Ouvrir le profil dans un nouvel onglet
          </a>
        </div>

        <p v-if="linkedinError" class="text-xs text-red-500">{{ linkedinError }}</p>
        <div class="flex justify-between items-center gap-2">
          <button
            v-if="linkedinLead.linkedinUrl"
            @click="clearLinkedin"
            :disabled="linkedinSaving"
            class="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg disabled:opacity-50"
          >Retirer le lien</button>
          <span v-else />
          <div class="flex gap-2">
            <button @click="closeLinkedinModal" class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">Fermer</button>
            <button
              @click="submitLinkedin"
              :disabled="linkedinSaving || !linkedinUrlInput.trim()"
              class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >{{ linkedinSaving ? 'Enregistrement…' : 'Enregistrer comme vérifié' }}</button>
          </div>
        </div>
      </div>
    </div>

    
    <div
      v-if="emailLead"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeEmailModal"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            Email
            <span v-if="emailLead.emailVerifiedStatus" class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
              :class="emailStatusBadgeClass(emailLead.emailVerifiedStatus)">
              {{ emailStatusLabel(emailLead.emailVerifiedStatus) }}
            </span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">
            {{ emailLead.email }}<span v-if="emailLead.name"> · {{ emailLead.name }}</span>
          </p>
        </div>

        
        <div class="border border-gray-100 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <div class="flex items-start gap-2">
            <span class="text-base">✓</span>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-gray-700 dark:text-slate-200">SMTP verify</p>
              <p class="text-[11px] text-gray-500 dark:text-slate-400 leading-snug">
                Handshake socket + RCPT TO sans envoi réel. Couverture ~75% (Gmail/Outlook/OVH/IONOS),
                inconcluant si le serveur fait du greylisting ou refuse les sondes.
              </p>
            </div>
          </div>
          <button
            @click="runEmailVerify"
            :disabled="emailVerifying"
            class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >{{ emailVerifying ? 'Sondage en cours…' : 'Lancer la vérification SMTP' }}</button>

          
          <div v-if="emailVerifyResult" class="text-[11px] mt-2 space-y-0.5 bg-gray-50 dark:bg-slate-800 rounded p-2">
            <p>
              <span class="font-semibold">Statut :</span>
              <span :class="emailStatusTextClass(emailVerifyResult.status)" class="font-semibold ml-1">{{ emailStatusLabel(emailVerifyResult.status) }}</span>
            </p>
            <p v-if="emailVerifyResult.mxHost"><span class="text-gray-500">MX :</span> {{ emailVerifyResult.mxHost }}</p>
            <p v-if="emailVerifyResult.code"><span class="text-gray-500">Code SMTP :</span> {{ emailVerifyResult.code }}</p>
            <p v-if="emailVerifyResult.detail" class="text-gray-500 break-all">{{ emailVerifyResult.detail }}</p>
            <p v-if="!emailVerifyResult.persisted" class="text-amber-600 dark:text-amber-400 mt-1">
              Source <b>{{ sourceLabel(emailLead) }}</b> : résultat non persisté (table sans colonne dédiée).
            </p>
          </div>

          
          <p v-else-if="emailLead.emailVerifiedAt" class="text-[11px] text-gray-500 dark:text-slate-400">
            Dernière vérification : <b>{{ emailStatusLabel(emailLead.emailVerifiedStatus) }}</b>
            le {{ formatDate(emailLead.emailVerifiedAt) }}.
          </p>
        </div>

        <p v-if="emailVerifyError" class="text-xs text-red-500">{{ emailVerifyError }}</p>
        <div class="flex justify-end gap-2">
          <button @click="closeEmailModal" class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">Fermer</button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="px-6 py-4 space-y-2">
        <div v-for="i in 10" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!leads.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun lead trouvé</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-3 py-2.5 w-8">
              <input
                type="checkbox"
                :checked="allOnPageSelected"
                :indeterminate.prop="someOnPageSelected"
                @change="togglePage"
                class="cursor-pointer"
                title="Tout sélectionner sur la page"
              />
            </th>
            <th @click="toggleSort('source')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Source<span class="text-gray-300">{{ sortGlyph('source') }}</span></span></th>
            <th @click="toggleSort('name')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Nom<span class="text-gray-300">{{ sortGlyph('name') }}</span></span></th>
            <th @click="toggleSort('profession')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Fonction<span class="text-gray-300">{{ sortGlyph('profession') }}</span></span></th>
            <th @click="toggleSort('company')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Société<span class="text-gray-300">{{ sortGlyph('company') }}</span></span></th>
            <th class="px-4 py-2.5 font-medium">Activité</th>
            <th @click="toggleSort('city')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Ville<span class="text-gray-300">{{ sortGlyph('city') }}</span></span></th>
            <th @click="toggleSort('website')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Site<span class="text-gray-300">{{ sortGlyph('website') }}</span></span></th>
            <th v-if="hasFeature('crm-leads-stack-detection')" @click="toggleSort('stack')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Stack<span class="text-gray-300">{{ sortGlyph('stack') }}</span></span></th>
            
            <th v-if="hasFeature('lead.ca')" @click="toggleSort('ca')" class="px-4 py-2.5 font-medium text-right cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">CA<span class="text-gray-300">{{ sortGlyph('ca') }}</span></span></th>
            <th v-if="hasFeature('lead.capa')" @click="toggleSort('capa')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Capa<span class="text-gray-300">{{ sortGlyph('capa') }}</span></span></th>
            <th v-if="hasFeature('crm-leads-generation-detection')" @click="toggleSort('generation')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Génération<span class="text-gray-300">{{ sortGlyph('generation') }}</span></span></th>
            <th @click="toggleSort('email')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Email<span class="text-gray-300">{{ sortGlyph('email') }}</span></span></th>
            <th class="px-4 py-2.5 font-medium">Tél</th>
            <th @click="toggleSort('date')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Date<span class="text-gray-300">{{ sortGlyph('date') }}</span></span></th>
          </tr>
          
          <tr class="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <th class="px-2 py-1.5">
              <button
                v-if="hasActiveColFilter"
                @click="clearColFilters"
                class="text-[10px] text-primary-600 hover:underline whitespace-nowrap"
                title="Réinitialiser les filtres"
              >×</button>
            </th>
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fSourceCol" class="filter-input">
                <option value="">Tous</option>
                <option value="lead">Lead</option>
                <option value="customer-noorder">Compte boutique</option>
                <option value="contact">Formulaire</option>
              </select>
            </th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fName" type="text" placeholder="Nom…" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fProfession" type="text" placeholder="Fonction…" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fCompany" type="text" placeholder="Société…" class="filter-input" /></th>
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fActivite" class="filter-input">
                <option value="">Toutes</option>
                <option v-for="a in activityOptions" :key="a.code" :value="a.code">{{ a.label }}</option>
              </select>
            </th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fCity" type="text" placeholder="Ville…" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fWebsite" type="text" placeholder="Site…" class="filter-input" /></th>
            <th v-if="hasFeature('crm-leads-stack-detection')" class="px-2 py-1.5" />
            <th v-if="hasFeature('lead.ca')" class="px-2 py-1.5"><input v-model.number="colFilters.fCaMin" type="number" min="0" step="100000" placeholder="CA min" class="filter-input text-right tabular-nums" /></th>
            <th v-if="hasFeature('lead.capa')" class="px-2 py-1.5" />
            <th v-if="hasFeature('crm-leads-generation-detection')" class="px-2 py-1.5" />
            <th class="px-2 py-1.5">
              <div class="flex gap-1 items-center">
                <input v-model="colFilters.fEmail" type="text" placeholder="Email…" class="filter-input flex-1" />
                <select v-model="colFilters.fEmailVerified" class="filter-input flex-shrink-0 w-16" title="Statut vérification">
                  <option value="">·</option>
                  <option value="ok">✓</option>
                  <option value="rejected">✗</option>
                  <option value="unknown">?</option>
                  <option value="none">—</option>
                </select>
              </div>
            </th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fPhone" type="text" placeholder="Tél…" class="filter-input" /></th>
            <th class="px-2 py-1.5" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in leads" :key="`${l.source}-${l.id}`"
              class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              :class="selection.has(rowKey(l)) ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''"
              @click="onRowClick(l)">
            <td class="px-3 py-2.5 w-8" @click.stop>
              <input
                type="checkbox"
                :checked="selection.has(rowKey(l))"
                @change="toggleRow(l)"
                class="cursor-pointer"
              />
            </td>
            <td class="px-4 py-2.5">
              <a
                v-if="sourceLink(l)"
                :href="sourceLink(l)!"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 underline-offset-2 hover:underline"
                :title="sourceLabelTitle(l)"
                @click.stop
              >{{ sourceLabel(l) }}</a>
              <span
                v-else
                class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="sourceBadgeClass(l)"
              >{{ sourceLabel(l) }}</span>
            </td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">
              <span class="inline-flex items-center gap-1">
                <span>{{ l.name || '—' }}</span>
                <button
                  v-if="canShowLinkedin(l)"
                  type="button"
                  @click.stop="openLinkedinModal(l)"
                  :title="l.linkedinUrl ? 'LinkedIn vérifié' : `Vérifier le profil LinkedIn de ${l.name}`"
                  :class="l.linkedinUrl
                    ? 'text-[10px] px-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-0.5'
                    : 'text-[10px] px-1 rounded text-blue-600 hover:bg-blue-50'"
                >
                  <span>in</span>
                  <svg v-if="l.linkedinUrl" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                </button>
              </span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ professionLabel(l) || '—' }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">
              <span class="inline-flex items-center gap-1">
                <span>{{ l.company || '—' }}</span>
                <a v-if="inseeUrl(l)" :href="inseeUrl(l)!" target="_blank" rel="noopener noreferrer" class="text-[10px] px-1 rounded text-emerald-700 hover:bg-emerald-50" :title="l.siren ? `Fiche INSEE ${l.siren}` : `Rechercher ${l.company} sur annuaire-entreprises`" @click.stop>🇫🇷</a>
              </span>
            </td>
            <td class="px-4 py-2.5 text-xs">
              <span v-if="l.activite" class="inline-block px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-medium">{{ activityLabel(l.activite) }}</span>
              <span v-else class="text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">
              <span v-if="l.city || l.country" :title="l.country ? `${l.city || ''} (${l.country})` : (l.city || '')">
                {{ l.city || '' }}<span v-if="l.country && l.country !== 'France'" class="text-[10px] text-gray-400"> · {{ l.country }}</span>
              </span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs">
              <a v-if="l.website" :href="normalizeUrl(l.website)" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline truncate inline-block max-w-[180px]" :title="l.website" @click.stop>{{ stripScheme(l.website) }}</a>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td v-if="hasFeature('crm-leads-stack-detection')" class="px-4 py-2.5 text-xs">
              <span v-if="l.websiteTech" class="px-1.5 py-0.5 rounded text-[10px] font-medium" :class="techBadgeClass(l.websiteTech)">{{ l.websiteTech }}</span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-right text-gray-700 dark:text-slate-200 font-mono tabular-nums">{{ formatCa(l.annualRevenue) }}</td>
            <td class="px-4 py-2.5 text-xs">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-medium" :class="capacityClass(l)" :title="capacityTooltip(l)">{{ capacityLabel(l) }}</span>
            </td>
            <td v-if="hasFeature('crm-leads-generation-detection')" class="px-4 py-2.5 text-xs">
              <span v-if="generationOf(l).label !== '?'" class="px-1.5 py-0.5 rounded text-[10px] font-medium" :class="generationClass(l)" :title="generationTooltip(l)">{{ generationOf(l).label }}</span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs">
              <button
                v-if="l.email"
                type="button"
                @click.stop="openEmailModal(l)"
                :title="emailVerifyTooltip(l)"
                class="inline-flex items-center gap-1 rounded hover:bg-gray-50 dark:hover:bg-slate-800 px-1 py-0.5 transition-colors"
                :class="emailBadgeTextClass(l)"
              >
                <span class="truncate max-w-[180px]">{{ l.email }}</span>
                <span v-if="l.emailVerifiedStatus === 'ok'" class="shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700" title="Vérifié SMTP">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                </span>
                <span v-else-if="l.emailVerifiedStatus === 'rejected'" class="shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-100 text-red-700" title="Rejeté SMTP">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </span>
                <span v-else-if="l.emailVerifiedStatus" class="shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-700" title="Inconcluant">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.007M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                </span>
              </button>
              <span v-else class="text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs">
              <a v-if="l.phone" :href="`tel:${normalizePhone(l.phone)}`" class="text-gray-600 dark:text-slate-300 hover:text-primary-600" @click.stop>{{ formatPhone(l.phone) }}</a>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(l.dateAdd) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="leads" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />

    
    <div
      v-if="capaModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="capaModalOpen = false"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">Configurer le scoring Capa</h2>
          <p class="text-xs text-gray-400 mt-0.5">Personnalisé par tenant — détermine quand un client est "Confortable", "Faisable" ou "Risqué" selon votre ticket commercial</p>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Libellé (optionnel)</label>
            <input v-model="capaForm.label" type="text" placeholder="ex : Capa B2B Bacchus" maxlength="64" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Ticket annuel cible (€)</label>
            <input v-model.number="capaForm.ticketAnnuelEur" type="number" min="0" step="100" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2" />
            <p class="text-[10px] text-gray-400 mt-0.5">Pour info — votre offre annuelle moyenne (abo + projet) en €.</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-emerald-600 mb-1">CA min "Confortable" (€)</label>
              <input v-model.number="capaForm.caConfortableMin" type="number" min="0" step="100000" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label class="block text-xs font-medium text-blue-600 mb-1">CA min "Faisable" (€)</label>
              <input v-model.number="capaForm.caFaisableMin" type="number" min="0" step="100000" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-red-600 mb-1">Ratio perte max toléré (% du CA)</label>
            <div class="flex items-center gap-2">
              <input v-model.number="capaLossPercent" type="number" min="0" max="100" step="1" class="w-24 text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2" />
              <span class="text-xs text-gray-500">% — au-delà → "Risqué"</span>
            </div>
          </div>
        </div>
        
        <div class="text-xs bg-gray-50 dark:bg-slate-800 rounded-lg p-3 space-y-1">
          <p class="font-medium text-gray-700 dark:text-slate-200 mb-1">Aperçu sur les leads chargés :</p>
          <div class="flex flex-wrap gap-2">
            <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">🟢 Confortable : {{ capaPreview.high }}</span>
            <span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">🔵 Faisable : {{ capaPreview.mid }}</span>
            <span class="px-2 py-0.5 rounded-full bg-red-50 text-red-700">🔴 Risqué : {{ capaPreview.low }}</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">⚪ ? : {{ capaPreview.na }}</span>
          </div>
        </div>
        <p v-if="capaError" class="text-xs text-red-500">{{ capaError }}</p>
        <div class="flex justify-end gap-2">
          <button @click="capaModalOpen = false" class="text-xs px-3 py-1.5 bg-white border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
          <button @click="submitCapaConfig" :disabled="capaSaving" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{{ capaSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
        </div>
      </div>
    </div>

    
    <div
      v-if="editLead"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="closeEdit"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ editLead.name || 'Lead' }}</h2>
          <p class="text-xs text-gray-400 mt-0.5">{{ editLead.company || '—' }}{{ editLead.profession ? ' · ' + editLead.profession : '' }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Verticale cible</label>
            <select v-model="editForm.verticalTarget" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2">
              <option value="a-classer">À classer</option>
              <option value="bacchus">Bacchus (food premium)</option>
              <option value="ceres">Cérès (food générique)</option>
              <option value="poseidon">Poséidon (mer)</option>
              <option value="hephaistos">Héphaïstos (transformation)</option>
              <option value="hermes">Hermès (négoce)</option>
              <option value="hors-cible">Hors-cible</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Tier</label>
            <select v-model="editForm.tier" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2">
              <option value="a-classer">À classer</option>
              <option value="t1">T1 (top 10-15)</option>
              <option value="t2">T2</option>
              <option value="t3">T3</option>
              <option value="veille">Veille</option>
              <option value="ecarte">Écarté</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Statut</label>
            <select v-model="editForm.atlasStatus" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2">
              <option value="nouveau">Nouveau</option>
              <option value="qualifie">Qualifié</option>
              <option value="veille">Veille</option>
              <option value="pret-contact">Prêt à contacter</option>
              <option value="ecarte">Écarté</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Risque relationnel</label>
            <select v-model="editForm.relationalRisk" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2">
              <option value="aucun">Aucun</option>
              <option value="voisin-example-shop">Voisin Example Shop</option>
              <option value="client-aude-connu">Client Aude connu</option>
              <option value="client-ac-connu">Client AC connu</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Notes atlas</label>
          <textarea v-model="editForm.notesAtlas" rows="3" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2"></textarea>
        </div>
        <p v-if="editError" class="text-xs text-red-500">{{ editError }}</p>
        <div class="flex justify-end gap-2">
          <button @click="closeEdit" class="text-xs px-3 py-1.5 bg-white border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
          <button @click="submitEdit" :disabled="editSaving" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{{ editSaving ? 'Enregistrement…' : 'Enregistrer' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { hasFeature, loadFeatures, loaded: featuresLoaded } = useFeatureFlag()

const leads = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(0)
const perPage = ref(100)
const perPageOptions = [100, 500, 1000, 5000, 10000]
function setPerPage(n: number) {
  perPage.value = n
  goPage(1)
}
const loading = ref(false)
const search = ref('')
const source = ref('')
const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const newLead = reactive({ firstname: '', lastname: '', email: '', company: '', phone: '' })

type EnrichmentSource = {
  key: string
  label: string
  icon: string
  tagline: string
  cost: string
  coverage: string
  legal: string
  method: string
  available: boolean
  docUrl?: string
}
const enrichmentSources: EnrichmentSource[] = [
  {
    key: 'sirene',
    label: 'Sirene',
    icon: '🇫🇷',
    tagline: 'Annuaire entreprises gov — SIRET, NAF, adresse, dirigeant légal',
    cost: 'Gratuit, sans clé API',
    coverage: '100% des entreprises FR actives (squelette identitaire)',
    legal: 'Données publiques INSEE — base légale OK',
    method: 'API recherche-entreprises.api.gouv.fr → INSERT/UPDATE company_name, siret, dirigeant',
    available: true,
    docUrl: 'https://recherche-entreprises.api.gouv.fr/docs/',
  },
  {
    key: 'gmaps',
    label: 'Google Maps Places',
    icon: '📍',
    tagline: 'Discovery géolocalisée — pâtisseries/chocolatiers à 30 km de Rungis',
    cost: 'Free tier 200 $/mois ≈ 10 000 fiches gratuites',
    coverage: '~95% des commerces physiques (name, tel, site, IG/FB parfois)',
    legal: 'API officielle Google — TOS OK pour usage commercial modéré',
    method: 'Places API Nearby Search par catégorie + rayon, INSERT smartlead lead_source=gmaps',
    available: false,
    docUrl: 'https://developers.google.com/maps/documentation/places/web-service',
  },
  {
    key: 'mentions-legales',
    label: 'Mentions légales',
    icon: '📄',
    tagline: 'Scrape /mentions-legales du site → email pro + dirigeant',
    cost: 'Gratuit (curl direct)',
    coverage: '~60% des sites artisanaux conformes LCEN',
    legal: 'Affichage obligatoire LCEN — scraping légal sur données publiques',
    method: 'curl + extract regex SIREN/email/tel/dirigeant, fallback /contact /cgv',
    available: false,
  },
  {
    key: 'instagram',
    label: 'Instagram Pro',
    icon: '📷',
    tagline: 'Profil Pro/Creator → email pro + tél cliquables (filon premium)',
    cost: 'Gratuit (JSON public profil)',
    coverage: '~70% des artisans premium (pâtissiers/chocolatiers MOF)',
    legal: 'Données publiques affichées par le compte — base légale OK',
    method: 'Fetch https://www.instagram.com/<handle>/?__a=1 puis parse business_email',
    available: false,
  },
  {
    key: 'facebook',
    label: 'Facebook Page',
    icon: '👥',
    tagline: 'Onglet "À propos" page publique → email + tel + horaires',
    cost: 'Gratuit',
    coverage: '~40% des artisans (FB en déclin chez <40 ans)',
    legal: 'Données publiques affichées par la page — OK',
    method: 'Scrape page publique /<slug>/about (rate limit 1 req/2s)',
    available: false,
  },
  {
    key: 'pappers',
    label: 'Pappers HTML',
    icon: '📊',
    tagline: 'Consultation publique → dirigeant nom+prénom+date naissance',
    cost: 'Gratuit (consultation HTML, pas l\'API)',
    coverage: '~90% (mandataires sociaux légaux publics)',
    legal: 'BODACC/Infogreffe — données légales publiques',
    method: 'Scrape doux 1 req/sec sur pappers.fr/entreprise/<slug>',
    available: false,
    docUrl: 'https://www.pappers.fr',
  },
  {
    key: 'smtp-verify',
    label: 'SMTP verify',
    icon: '✓',
    tagline: 'Valider un email deviné via handshake SMTP (sans envoi)',
    cost: 'Gratuit (socket + RCPT TO)',
    coverage: '~75% des serveurs MX répondent (Gmail/Outlook/OVH/IONOS)',
    legal: 'Aucun envoi réel — pas de spam, RGPD-clean',
    method: 'Connexion MX, MAIL FROM + RCPT TO, lecture code 250/550, fermeture',
    available: false,
  },
]

const enrichmentOpen = ref(false)
const enrichmentKey = ref<string | null>(null)
const currentSource = computed<EnrichmentSource | null>(
  () => enrichmentSources.find((s) => s.key === enrichmentKey.value) || null,
)
function openEnrichment(key: string) {
  enrichmentKey.value = key
  enrichmentOpen.value = true
}

const importOpen = ref(false)
const importTargetFields = [
  { key: 'email', label: 'Email', required: true },
  { key: 'firstname', label: 'Prénom' },
  { key: 'lastname', label: 'Nom' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'company', label: 'Société' },
  { key: 'siret', label: 'SIRET' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Statut' },
  { key: 'leadSource', label: 'Source' },
  { key: 'note', label: 'Note' },
]
const importFieldAliases: Record<string, string[]> = {
  email: ['email', 'mail', 'e-mail', 'courriel'],
  firstname: ['prenom', 'prénom', 'firstname', 'first name'],
  lastname: ['nom', 'lastname', 'last name', 'name'],
  phone: ['telephone', 'téléphone', 'phone', 'tel'],
  company: ['societe', 'société', 'company', 'company_name', 'entreprise'],
  siret: ['siret', 'siren'],
  type: ['type', 'categorie', 'catégorie'],
  status: ['statut', 'status', 'etat', 'état'],
  leadSource: ['source', 'lead_source', 'origine', 'canal'],
  note: ['note', 'notes', 'commentaire', 'remarque'],
}

function setSource(s: string) {
  source.value = s
  page.value = 1
  load()
}

async function createLead() {
  creating.value = true
  createError.value = ''
  try {
    await $fetch('/api/bo/leads/create', { method: 'POST', body: newLead })
    showCreate.value = false
    Object.assign(newLead, { firstname: '', lastname: '', email: '', company: '', phone: '' })
    await load()
  } catch (err: any) {
    createError.value = err?.data?.message || 'Erreur de création'
  } finally { creating.value = false }
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

const colFilters = reactive({
  fSourceCol: '' as string,
  fName: '' as string,
  fProfession: '' as string,
  fCompany: '' as string,
  fActivite: '' as string,
  fCity: '' as string,
  fWebsite: '' as string,
  fCaMin: null as number | null,
  fEmail: '' as string,
  fEmailVerified: '' as string,
  fPhone: '' as string,
})
const hasActiveColFilter = computed(() => {
  return Boolean(
    colFilters.fSourceCol || colFilters.fName || colFilters.fProfession ||
    colFilters.fCompany || colFilters.fActivite || colFilters.fCity ||
    colFilters.fWebsite || colFilters.fEmail || colFilters.fPhone ||
    colFilters.fEmailVerified ||
    (colFilters.fCaMin != null && colFilters.fCaMin > 0),
  )
})
function clearColFilters() {
  colFilters.fSourceCol = ''
  colFilters.fName = ''
  colFilters.fProfession = ''
  colFilters.fCompany = ''
  colFilters.fActivite = ''
  colFilters.fCity = ''
  colFilters.fWebsite = ''
  colFilters.fCaMin = null
  colFilters.fEmail = ''
  colFilters.fEmailVerified = ''
  colFilters.fPhone = ''
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/leads', {
      query: {
        page: page.value, perPage: perPage.value,
        search: search.value, source: source.value,
        sort: sortKey.value || undefined, dir: sortDir.value || undefined,
        
        fSourceCol:    colFilters.fSourceCol || undefined,
        fName:         colFilters.fName || undefined,
        fProfession:   colFilters.fProfession || undefined,
        fCompany:      colFilters.fCompany || undefined,
        fActivite:     colFilters.fActivite || undefined,
        fCity:         colFilters.fCity || undefined,
        fWebsite:      colFilters.fWebsite || undefined,
        fCaMin:        colFilters.fCaMin && colFilters.fCaMin > 0 ? colFilters.fCaMin : undefined,
        fEmail:        colFilters.fEmail || undefined,
        fEmailVerified: colFilters.fEmailVerified || undefined,
        fPhone:        colFilters.fPhone || undefined,
      },
    })
    leads.value = data.leads ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

let colFilterTimer: any = null
watch(colFilters, () => {
  if (colFilterTimer) clearTimeout(colFilterTimer)
  colFilterTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
}, { deep: true })

const sortKey = ref<string>('ca')
const sortDir = ref<'asc' | 'desc'>('desc')

const SORT_PREF_KEY = 'hub:leads:sort'
function loadSortPref() {
  try {
    const raw = localStorage.getItem(SORT_PREF_KEY)
    if (!raw) return
    const obj = JSON.parse(raw)
    if (obj?.key && typeof obj.key === 'string') sortKey.value = obj.key
    if (obj?.dir === 'asc' || obj?.dir === 'desc') sortDir.value = obj.dir
  } catch {  }
}
watch([sortKey, sortDir], ([k, d]) => {
  try {
    localStorage.setItem(SORT_PREF_KEY, JSON.stringify({ key: k, dir: d }))
  } catch {  }
})
function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    
    
    
    
    sortDir.value = ['ca', 'generation', 'date'].includes(key) ? 'desc' : 'asc'
  }
  page.value = 1
  load()
}
function sortGlyph(key: string): string {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? '▲' : '▼'
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

import { CUSTOMER_ACTIVITIES } from '~/utils/customerActivity'
const activityLabelMap = Object.fromEntries(CUSTOMER_ACTIVITIES.map((a) => [a.code, a.label]))
const activityOptions = CUSTOMER_ACTIVITIES
function activityLabel(code: string | null | undefined): string {
  if (!code) return ''
  return activityLabelMap[code] || code
}

function normalizeUrl(u: string): string {
  if (!u) return '#'
  if (/^https?:\/\//i.test(u)) return u
  return 'https://' + u.replace(/^\/+/, '')
}
function stripScheme(u: string): string {
  return (u || '').replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

function professionLabel(l: any): string {
  return (l?.profession && String(l.profession).trim())
    || (l?.dirigeantRole && String(l.dirigeantRole).trim())
    || ''
}

function linkedinSearchUrl(l: any): string | null {
  const parts: string[] = []
  if (l?.firstname) parts.push(String(l.firstname))
  if (l?.lastname) parts.push(String(l.lastname))
  if (l?.company) parts.push('"' + String(l.company) + '"')
  if (parts.length < 2) return null
  const q = encodeURIComponent('site:linkedin.com/in/ ' + parts.join(' '))
  return `https://www.google.com/search?q=${q}`
}

function normalizePhone(p: string): string {
  return (p || '').replace(/[^\d+]/g, '')
}
function formatPhone(p: string): string {
  
  const digits = (p || '').replace(/[^\d]/g, '')
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
  }
  if (digits.length === 11 && digits.startsWith('33')) {
    return '0' + digits.slice(2).replace(/(\d{2})(?=\d)/g, '$1 ').trim()
  }
  return p
}
function inseeUrl(l: any): string | null {
  const siren = l?.siren ? String(l.siren).replace(/\D/g, '').slice(0, 9) : ''
  if (siren.length === 9) {
    return `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`
  }
  if (l?.company && String(l.company).trim().length >= 3) {
    return `https://annuaire-entreprises.data.gouv.fr/rechercher?terme=${encodeURIComponent(String(l.company).trim())}`
  }
  return null
}

const LEAD_SOURCE_DOCS: Record<string, { label: string; url?: string }> = {
  'rungis-carnet-2025': {
    label: 'Carnet Rungis 2025',
    url: 'https://cms.rungisinternational.com/uploads/Carnet_d_adresses_du_Marche_2024_b1458ab6e0.pdf',
  },
  shop_signup: { label: 'Compte boutique' },
  contact_form: { label: 'Formulaire' },
  manual: { label: 'Manuel' },
  calendly: { label: 'Calendly' },
}

function sourceLink(l: any): string | null {
  const src = l?.leadSource
  if (src && LEAD_SOURCE_DOCS[src]?.url) return LEAD_SOURCE_DOCS[src].url!
  return null
}
function sourceLabel(l: any): string {
  const src = l?.leadSource
  if (src && LEAD_SOURCE_DOCS[src]) return LEAD_SOURCE_DOCS[src].label
  if (l?.source === 'customer-noorder') return 'Compte boutique'
  if (l?.source === 'contact') return 'Contact'
  return 'Lead'
}
function sourceLabelTitle(l: any): string {
  const src = l?.leadSource
  if (src && LEAD_SOURCE_DOCS[src]?.url)
    return `Ouvrir le document source : ${LEAD_SOURCE_DOCS[src].label}`
  return ''
}
function sourceBadgeClass(l: any): string {
  if (l?.source === 'customer-noorder') return 'bg-orange-50 text-orange-700'
  if (l?.source === 'contact') return 'bg-amber-50 text-amber-600'
  return 'bg-indigo-50 text-indigo-600' 
}

function formatCa(v: any): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' M€'
  if (n >= 1_000) return Math.round(n / 1_000) + ' k€'
  return n + ' €'
}

const TECH_BADGE: Record<string, string> = {
  prestashop: 'bg-emerald-50 text-emerald-700',
  shopify: 'bg-emerald-50 text-emerald-700',
  magento: 'bg-emerald-50 text-emerald-700',
  shopware: 'bg-emerald-50 text-emerald-700',
  oxatis: 'bg-emerald-50 text-emerald-700',
  pageshop: 'bg-emerald-50 text-emerald-700',
  wordpress: 'bg-blue-50 text-blue-700',
  drupal: 'bg-blue-50 text-blue-700',
  joomla: 'bg-blue-50 text-blue-700',
  wix: 'bg-purple-50 text-purple-700',
  squarespace: 'bg-purple-50 text-purple-700',
  webflow: 'bg-purple-50 text-purple-700',
  custom: 'bg-gray-100 text-gray-600',
  vetuste: 'bg-amber-50 text-amber-700',
  indispo: 'bg-red-50 text-red-700',
}
function techBadgeClass(tech: string): string {
  return TECH_BADGE[(tech || '').toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}

const capaConfig = reactive({
  ticketAnnuelEur: 10000,
  caConfortableMin: 5_000_000,
  caFaisableMin: 1_000_000,
  lossRatioMax: 0.10,
  label: '',
})

function computeCapacity(l: any): { label: string; level: 'high' | 'mid' | 'low' | 'na' } {
  const ca = Number(l?.annualRevenue ?? 0)
  const net = l?.netResult != null ? Number(l.netResult) : null
  if (!ca && net == null) return { label: '?', level: 'na' }
  
  if (net != null && net < 0 && ca > 0 && Math.abs(net) / ca > capaConfig.lossRatioMax) {
    return { label: 'Risqué', level: 'low' }
  }
  
  if (ca > 0 && ca < capaConfig.caFaisableMin) return { label: 'Risqué', level: 'low' }
  
  if (ca >= capaConfig.caConfortableMin && (net == null || net >= 0))
    return { label: 'Confortable', level: 'high' }
  
  if (ca >= capaConfig.caFaisableMin && (net == null || net >= 0))
    return { label: 'Faisable', level: 'mid' }
  
  if (ca >= capaConfig.caConfortableMin && net != null && net < 0)
    return { label: 'Faisable', level: 'mid' }
  
  if (net != null && net > 100_000)
    return { label: 'Faisable', level: 'mid' }
  return { label: '?', level: 'na' }
}

function capacityLabel(l: any): string {
  return computeCapacity(l).label
}

const CAP_CLASS: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700',
  mid: 'bg-blue-50 text-blue-700',
  low: 'bg-red-50 text-red-700',
  na: 'bg-gray-100 text-gray-500',
}
function capacityClass(l: any): string {
  return CAP_CLASS[computeCapacity(l).level]
}

function capacityTooltip(l: any): string {
  const ca = Number(l?.annualRevenue ?? 0)
  const net = l?.netResult != null ? Number(l.netResult) : null
  const parts: string[] = []
  if (ca > 0) parts.push(`CA ${formatCa(ca)}`)
  if (net != null) parts.push(`Net ${formatCa(net)}`)
  if (l?.headcount) parts.push(`${l.headcount} sal.`)
  if (parts.length === 0) return 'Données financières non publiées'
  return parts.join(' · ') + ' — capacité estimée pour abo 800€/m + projet 10k€'
}

const CURRENT_YEAR = new Date().getFullYear()
function generationOf(l: any): { label: string; level: 'young' | 'pivot' | 'senior' | 'na'; age: number | null } {
  const year = l?.dirigeantBirthYear != null ? Number(l.dirigeantBirthYear) : null
  if (!year || year < 1900) return { label: '?', level: 'na', age: null }
  const age = CURRENT_YEAR - year
  if (age < 45) return { label: 'Jeune', level: 'young', age }
  if (age <= 60) return { label: 'Pivot', level: 'pivot', age }
  return { label: 'Senior', level: 'senior', age }
}
const GEN_CLASS: Record<string, string> = {
  young: 'bg-emerald-50 text-emerald-700',
  pivot: 'bg-blue-50 text-blue-700',
  senior: 'bg-amber-50 text-amber-700',
  na: 'bg-gray-100 text-gray-500',
}
function generationClass(l: any): string {
  return GEN_CLASS[generationOf(l).level]
}
function generationTooltip(l: any): string {
  const g = generationOf(l)
  const role = l?.dirigeantRole ? ` ${l.dirigeantRole}` : ''
  const name = l?.dirigeantFullName ? ` ${l.dirigeantFullName}` : ''
  if (g.age == null) return 'Dirigeant légal non publié au RNE'
  const ageWord = g.level === 'senior'
    ? ' — chercher l\'héritier opérationnel sur LinkedIn'
    : g.level === 'young' ? ' — profil "repreneur moderne", cible idéale' : ''
  return `${g.age} ans${role}${name}${ageWord}`
}

const capaModalOpen = ref(false)
const capaSaving = ref(false)
const capaError = ref('')
const capaForm = reactive({
  label: '',
  ticketAnnuelEur: 10000,
  caConfortableMin: 5_000_000,
  caFaisableMin: 1_000_000,
  lossRatioMax: 0.10,
})

const capaLossPercent = computed({
  get: () => Math.round((capaForm.lossRatioMax ?? 0) * 100),
  set: (v: number) => { capaForm.lossRatioMax = Math.max(0, Math.min(100, Number(v) || 0)) / 100 },
})

const capaPreview = computed(() => {
  const buckets = { high: 0, mid: 0, low: 0, na: 0 }
  const form = capaForm
  for (const l of leads.value) {
    const ca = Number(l?.annualRevenue ?? 0)
    const net = l?.netResult != null ? Number(l.netResult) : null
    if (!ca && net == null) { buckets.na++; continue }
    if (net != null && net < 0 && ca > 0 && Math.abs(net) / ca > form.lossRatioMax) {
      buckets.low++; continue
    }
    if (ca > 0 && ca < form.caFaisableMin) { buckets.low++; continue }
    if (ca >= form.caConfortableMin && (net == null || net >= 0)) { buckets.high++; continue }
    if (ca >= form.caFaisableMin && (net == null || net >= 0)) { buckets.mid++; continue }
    if (ca >= form.caConfortableMin && net != null && net < 0) { buckets.mid++; continue }
    if (net != null && net > 100_000) { buckets.mid++; continue }
    buckets.na++
  }
  return buckets
})

async function loadCapaConfig() {
  try {
    const data = await $fetch<any>('/api/bo/leads/capa-config')
    if (data?.config) {
      Object.assign(capaConfig, data.config)
      Object.assign(capaForm, data.config)
    }
  } catch (err) {
    console.warn('[capa-config] load failed', err)
  }
}
async function submitCapaConfig() {
  capaSaving.value = true
  capaError.value = ''
  try {
    const data = await $fetch<any>('/api/bo/leads/capa-config', {
      method: 'PUT',
      body: { ...capaForm },
    })
    if (data?.config) {
      Object.assign(capaConfig, data.config)
    }
    capaModalOpen.value = false
  } catch (err: any) {
    capaError.value = err?.data?.statusMessage || err?.message || 'Erreur de sauvegarde'
  } finally {
    capaSaving.value = false
  }
}

const router2 = useRouter()
const editLead = ref<any | null>(null)
const editSaving = ref(false)
const editError = ref('')
const editForm = reactive({
  verticalTarget: 'a-classer',
  tier: 'a-classer',
  atlasStatus: 'nouveau',
  relationalRisk: 'aucun',
  notesAtlas: '',
})

function onRowClick(l: any) {
  
  if (l?.source === 'customer-noorder') {
    router2.push(`/hub/contacts/${l.id}`)
    return
  }
  
  if (l?.source === 'contact') return
  
  editLead.value = l
  editError.value = ''
  Object.assign(editForm, {
    verticalTarget: l?.verticalTarget ?? 'a-classer',
    tier: l?.tier ?? 'a-classer',
    atlasStatus: l?.atlasStatus ?? 'nouveau',
    relationalRisk: l?.relationalRisk ?? 'aucun',
    notesAtlas: l?.notesAtlas ?? '',
  })
}
function closeEdit() {
  editLead.value = null
  editError.value = ''
}
async function submitEdit() {
  if (!editLead.value) return
  editSaving.value = true
  editError.value = ''
  try {
    await $fetch(`/api/bo/leads/${editLead.value.id}/atlas`, {
      method: 'PUT',
      body: { ...editForm },
    })
    closeEdit()
    await load()
  } catch (err: any) {
    editError.value = err?.data?.statusMessage || err?.message || 'Erreur de sauvegarde'
  } finally {
    editSaving.value = false
  }
}

const linkedinLead = ref<any | null>(null)
const linkedinUrlInput = ref('')
const linkedinSaving = ref(false)
const linkedinError = ref('')

function canShowLinkedin(l: any): boolean {
  return Boolean(l?.firstname || l?.lastname || l?.name)
}
function openLinkedinModal(l: any) {
  linkedinLead.value = l
  linkedinUrlInput.value = (l?.linkedinUrl || '').toString()
  linkedinError.value = ''
}
function closeLinkedinModal() {
  linkedinLead.value = null
  linkedinError.value = ''
}
async function submitLinkedin() {
  if (!linkedinLead.value) return
  const url = linkedinUrlInput.value.trim()
  if (!url) { linkedinError.value = 'URL requise (ou clique « Retirer le lien »).'; return }
  if (!/^https?:\/\/.+linkedin\.com\//i.test(url)) {
    linkedinError.value = 'URL LinkedIn invalide (doit commencer par https://…linkedin.com/).'
    return
  }
  linkedinSaving.value = true
  linkedinError.value = ''
  try {
    const source = linkedinLead.value.source
    await $fetch(`/api/bo/leads/${linkedinLead.value.id}/linkedin`, {
      method: 'PUT',
      body: { url, source },
    })
    const row = leads.value.find((r) => r.source === source && r.id === linkedinLead.value!.id)
    if (row) row.linkedinUrl = url
    closeLinkedinModal()
  } catch (err: any) {
    linkedinError.value = err?.data?.statusMessage || err?.message || 'Erreur de sauvegarde'
  } finally {
    linkedinSaving.value = false
  }
}
async function clearLinkedin() {
  if (!linkedinLead.value) return
  linkedinSaving.value = true
  linkedinError.value = ''
  try {
    const source = linkedinLead.value.source
    await $fetch(`/api/bo/leads/${linkedinLead.value.id}/linkedin`, {
      method: 'PUT',
      body: { url: '', source },
    })
    const row = leads.value.find((r) => r.source === source && r.id === linkedinLead.value!.id)
    if (row) row.linkedinUrl = ''
    closeLinkedinModal()
  } catch (err: any) {
    linkedinError.value = err?.data?.statusMessage || err?.message || 'Erreur de sauvegarde'
  } finally {
    linkedinSaving.value = false
  }
}

const EMAIL_STATUS_LABELS: Record<string, string> = {
  ok: 'Vérifié',
  rejected: 'Rejeté',
  unknown: 'Inconcluant',
  mx_missing: 'MX absent',
  connect_failed: 'Injoignable',
  invalid_input: 'Email invalide',
}
function emailStatusLabel(s: string | null | undefined): string {
  return EMAIL_STATUS_LABELS[String(s || '')] || 'Non testé'
}
function emailStatusBadgeClass(s: string): string {
  if (s === 'ok') return 'bg-emerald-100 text-emerald-700'
  if (s === 'rejected') return 'bg-red-100 text-red-700'
  if (s === 'mx_missing' || s === 'invalid_input') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}
function emailStatusTextClass(s: string): string {
  if (s === 'ok') return 'text-emerald-700 dark:text-emerald-400'
  if (s === 'rejected' || s === 'mx_missing' || s === 'invalid_input') return 'text-red-600 dark:text-red-400'
  return 'text-amber-600 dark:text-amber-400'
}
function emailBadgeTextClass(l: any): string {
  if (l?.emailVerifiedStatus === 'ok') return 'text-gray-600 dark:text-slate-300'
  if (l?.emailVerifiedStatus === 'rejected' || l?.emailVerifiedStatus === 'mx_missing') return 'text-gray-400 line-through'
  return 'text-gray-400'
}
function emailVerifyTooltip(l: any): string {
  if (!l?.emailVerifiedStatus) return `Vérifier ${l?.email || 'l\'email'} via SMTP`
  const when = l?.emailVerifiedAt ? ` le ${formatDate(l.emailVerifiedAt)}` : ''
  return `Email ${emailStatusLabel(l.emailVerifiedStatus).toLowerCase()}${when}`
}

const emailLead = ref<any | null>(null)
const emailVerifying = ref(false)
const emailVerifyError = ref('')
const emailVerifyResult = ref<{
  status: string; code: number | null; detail: string | null; mxHost: string | null; persisted: boolean
} | null>(null)

function openEmailModal(l: any) {
  emailLead.value = l
  emailVerifyResult.value = null
  emailVerifyError.value = ''
}
function closeEmailModal() {
  emailLead.value = null
  emailVerifyResult.value = null
  emailVerifyError.value = ''
}
async function runEmailVerify() {
  if (!emailLead.value) return
  emailVerifying.value = true
  emailVerifyError.value = ''
  emailVerifyResult.value = null
  try {
    const res = await $fetch<any>(`/api/bo/leads/${emailLead.value.id}/email-verify`, {
      method: 'POST',
      body: { source: emailLead.value.source, email: emailLead.value.email },
      timeout: 12000,
    })
    emailVerifyResult.value = {
      status:    String(res?.status || 'unknown'),
      code:      res?.code ?? null,
      detail:    res?.detail ?? null,
      mxHost:    res?.mxHost ?? null,
      persisted: Boolean(res?.persisted),
    }
    
    if (res?.persisted && emailLead.value.source === 'lead') {
      const row = leads.value.find((r) => r.source === 'lead' && r.id === emailLead.value!.id)
      if (row) {
        row.emailVerifiedStatus = res.status
        row.emailVerifiedAt = res.verifiedAt
      }
      emailLead.value.emailVerifiedStatus = res.status
      emailLead.value.emailVerifiedAt = res.verifiedAt
    }
  } catch (err: any) {
    emailVerifyError.value = err?.data?.statusMessage || err?.message || 'Erreur de vérification'
  } finally {
    emailVerifying.value = false
  }
}

const selection = reactive<Set<string>>(new Set())
function rowKey(l: any): string { return `${l.source}-${l.id}` }
function toggleRow(l: any) {
  const k = rowKey(l)
  if (selection.has(k)) selection.delete(k); else selection.add(k)
}
function clearSelection() { selection.clear() }
const allOnPageSelected = computed(
  () => leads.value.length > 0 && leads.value.every((l) => selection.has(rowKey(l))),
)
const someOnPageSelected = computed(
  () => !allOnPageSelected.value && leads.value.some((l) => selection.has(rowKey(l))),
)
function togglePage() {
  if (allOnPageSelected.value) {
    for (const l of leads.value) selection.delete(rowKey(l))
  } else {
    for (const l of leads.value) selection.add(rowKey(l))
  }
}

const selectionCounts = computed(() => {
  const counts = { lead: 0, contact: 0, customerNoorder: 0 }
  for (const l of leads.value) {
    if (!selection.has(rowKey(l))) continue
    if (l.source === 'lead') counts.lead++
    else if (l.source === 'contact') counts.contact++
    else if (l.source === 'customer-noorder') counts.customerNoorder++
  }
  return counts
})

const selectionEmailCount = computed(() => {
  let n = 0
  for (const l of leads.value) {
    if (!selection.has(rowKey(l))) continue
    if (l.email) n++
  }
  return n
})

const bulkVerifyOpen = ref(false)
const bulkVerifyRunning = ref(false)
const bulkVerifyShouldStop = ref(false)
const bulkVerifyTotal = ref(0)
const bulkVerifyDone = ref(0)
const bulkVerifyCurrent = ref('')
const bulkVerifyError = ref('')
const bulkVerifyCounts = reactive({ ok: 0, rejected: 0, unknown: 0, errors: 0 })

function openBulkVerify() {
  if (!selectionEmailCount.value) return
  bulkVerifyTotal.value = selectionEmailCount.value
  bulkVerifyDone.value = 0
  bulkVerifyCurrent.value = ''
  bulkVerifyError.value = ''
  bulkVerifyShouldStop.value = false
  Object.assign(bulkVerifyCounts, { ok: 0, rejected: 0, unknown: 0, errors: 0 })
  bulkVerifyOpen.value = true
}
function closeBulkVerify() {
  if (bulkVerifyRunning.value) return
  bulkVerifyOpen.value = false
}

async function runBulkVerify() {
  const targets = leads.value.filter((l) => selection.has(rowKey(l)) && l.email)
  if (!targets.length) { bulkVerifyOpen.value = false; return }

  bulkVerifyRunning.value = true
  bulkVerifyError.value = ''
  bulkVerifyShouldStop.value = false
  bulkVerifyTotal.value = targets.length
  bulkVerifyDone.value = 0
  Object.assign(bulkVerifyCounts, { ok: 0, rejected: 0, unknown: 0, errors: 0 })

  const queue = [...targets]
  const CONCURRENCY = 3

  async function worker() {
    while (queue.length > 0 && !bulkVerifyShouldStop.value) {
      const l = queue.shift()
      if (!l) break
      bulkVerifyCurrent.value = l.email
      try {
        const res = await $fetch<any>(`/api/bo/leads/${l.id}/email-verify`, {
          method: 'POST',
          body: { source: l.source, email: l.email },
          timeout: 12000,
        })
        const status = String(res?.status || 'unknown')
        if (status === 'ok') bulkVerifyCounts.ok++
        else if (status === 'rejected' || status === 'mx_missing') bulkVerifyCounts.rejected++
        else bulkVerifyCounts.unknown++
        
        const row = leads.value.find((r) => r.source === l.source && r.id === l.id)
        if (row) {
          row.emailVerifiedStatus = status
          row.emailVerifiedAt = res?.verifiedAt
        }
      } catch (err: any) {
        bulkVerifyCounts.errors++
        console.warn('[bulk-verify]', l.email, err?.message)
      } finally {
        bulkVerifyDone.value++
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  } catch (err: any) {
    bulkVerifyError.value = err?.message || 'Erreur durant le sondage'
  } finally {
    bulkVerifyRunning.value = false
    bulkVerifyCurrent.value = ''
  }
}

function exportSelectionCsv() {
  const rows = leads.value.filter((l) => selection.has(rowKey(l)))
  if (!rows.length) return
  const headers = [
    'Source', 'ID', 'Nom', 'Email', 'Téléphone', 'Société', 'SIRET', 'Activité',
    'Ville', 'Pays', 'Site', 'CA', 'Date',
  ]
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [headers.join(';')]
  for (const r of rows) {
    lines.push([
      r.source, r.id,
      esc(r.name), esc(r.email), esc(r.phone), esc(r.company), esc(r.siren || r.siret),
      esc(r.activite), esc(r.city), esc(r.country),
      esc(r.website),
      r.annualRevenue || '',
      r.dateAdd ? new Date(r.dateAdd).toISOString().slice(0, 10) : '',
    ].join(';'))
  }
  const csv = '﻿' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-selection-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

const bulkDeleteOpen = ref(false)
const bulkDeleting = ref(false)
const bulkDeleteError = ref('')
const bulkDeleteMode = ref<'soft' | 'hard'>('soft')
async function submitBulkDelete() {
  bulkDeleting.value = true
  bulkDeleteError.value = ''
  try {
    const items = leads.value
      .filter((l) => selection.has(rowKey(l)))
      .map((l) => ({ source: l.source, id: l.id }))
    await $fetch('/api/bo/leads/bulk-delete', {
      method: 'POST',
      body: { items, mode: bulkDeleteMode.value },
    })
    selection.clear()
    bulkDeleteOpen.value = false
    await load()
  } catch (err: any) {
    bulkDeleteError.value = err?.data?.statusMessage || err?.message || 'Erreur de suppression'
  } finally {
    bulkDeleting.value = false
  }
}

onMounted(() => {
  if (!featuresLoaded.value) loadFeatures()
  loadCapaConfig()
  loadSortPref()
  load()
})
</script>

<style scoped>
.filter-input {
  @apply w-full text-[11px] border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300 transition-colors;
}
</style>
