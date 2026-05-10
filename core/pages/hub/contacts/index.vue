<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ segmentTitle }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ total }} {{ segmentNoun }}{{ total > 1 ? 's' : '' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button @click="setSegment('lead')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="segment === 'lead' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800'">Leads</button>
          <button @click="setSegment('client')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="segment === 'client' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800'">Clients</button>
          <button @click="setSegment('all')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="segment === 'all' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800'">Tous</button>
        </div>
        <input
          v-model="search"
          type="text"
          placeholder="Nom, email, société…"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <a
          href="/api/bo/customers/export"
          download
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Télécharger tous les clients (CSV)"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Exporter
        </a>
        <button
          @click="importOpen = true"
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Importer des clients depuis un CSV"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
          Importer
        </button>
        <button @click="showCreate = true" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouveau {{ segmentNoun }}
        </button>
      </div>
    </header>

    <HubImportModal
      :open="importOpen"
      title="Importer des clients"
      subtitle="CSV — UPSERT par email. Ne touche qu'à ps_customer (fiche annuaire). Les commandes et adresses sont préservées."
      endpoint="/api/bo/customers/import"
      :target-fields="importTargetFields"
      :field-aliases="importFieldAliases"
      :matching-keys="['email']"
      create-missing-label="Créer les clients manquants"
      create-missing-hint="Insère un client avec mot de passe temporaire (reset requis). Prénom + nom obligatoires pour créer."
      @close="importOpen = false"
      @done="load"
    />

    <!-- Contact creation modal -->
    <HubCreateModal v-model="showCreate" :title="`Nouveau ${segmentNoun}`" :loading="creating" @submit="createClient">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs font-medium text-gray-500 mb-1">Prénom</label><input v-model="newClient.firstname" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
          <div><label class="block text-xs font-medium text-gray-500 mb-1">Nom</label><input v-model="newClient.lastname" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        </div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Email</label><input v-model="newClient.email" type="email" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Société</label><input v-model="newClient.company" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Téléphone</label><input v-model="newClient.phone" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <p v-if="createError" class="text-xs text-red-500">{{ createError }}</p>
      </div>
    </HubCreateModal>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" :label="segmentNoun + 's'"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <!-- Bulk action bar — appears as soon as at least 1 row is checked. -->
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

    <!-- Modal confirmation suppression en lot -->
    <div
      v-if="bulkDeleteOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="bulkDeleteOpen = false"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">Supprimer {{ selection.size }} {{ segmentNoun }}{{ selection.size > 1 ? 's' : '' }} ?</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Soft delete (ps_customer.deleted = 1). Les comptes ne sont
            plus listés mais restent reliés à leurs commandes historiques
            (audit + conservation légale). Les adresses, factures, paniers
            sont préservés.
          </p>
          <ul class="text-xs text-gray-600 dark:text-slate-300 mt-3 space-y-0.5 pl-1">
            <li v-if="selectionCounts.client">• <b>{{ selectionCounts.client }}</b> client{{ selectionCounts.client > 1 ? 's' : '' }} avec commandes (historique conservé)</li>
            <li v-if="selectionCounts.lead">• <b>{{ selectionCounts.lead }}</b> compte{{ selectionCounts.lead > 1 ? 's' : '' }} sans commande</li>
          </ul>
        </div>
        <p v-if="bulkDeleteError" class="text-xs text-red-500">{{ bulkDeleteError }}</p>
        <div class="flex justify-end gap-2">
          <button @click="bulkDeleteOpen = false" class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
          <button @click="submitBulkDelete" :disabled="bulkDeleting" class="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{{ bulkDeleting ? 'Suppression…' : 'Confirmer la suppression' }}</button>
        </div>
      </div>
    </div>

    <!-- Modal LinkedIn — recherche Google + sauvegarde URL profil -->
    <div
      v-if="linkedinClient"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeLinkedinModal"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            LinkedIn
            <span v-if="linkedinClient.linkedinUrl" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold uppercase tracking-wider">Vérifié</span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {{ linkedinClient.firstname }} {{ linkedinClient.lastname }}<span v-if="linkedinClient.company"> · {{ linkedinClient.company }}</span>
          </p>
        </div>

        <!-- Step 1: Google search -->
        <div class="border border-gray-100 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Étape 1 — Trouver le profil</p>
          <a
            v-if="linkedinSearchUrl(linkedinClient)"
            :href="linkedinSearchUrl(linkedinClient)!"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            Rechercher sur Google (site:linkedin.com/in/)
          </a>
          <p v-else class="text-xs text-gray-400">Nom incomplet — recherche indisponible.</p>
        </div>

        <!-- Step 2: Verified URL -->
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
            v-if="linkedinClient.linkedinUrl"
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

    <!-- Modal Email — sondage SMTP RCPT TO + persistance -->
    <div
      v-if="emailClient"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeEmailModal"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            Email
            <span v-if="emailClient.emailVerifiedStatus" class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
              :class="emailStatusBadgeClass(emailClient.emailVerifiedStatus)">
              {{ emailStatusLabel(emailClient.emailVerifiedStatus) }}
            </span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">
            {{ emailClient.email }}<span v-if="emailClient.firstname || emailClient.lastname"> · {{ emailClient.firstname }} {{ emailClient.lastname }}</span>
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
              Résultat non persisté (drift schéma — colonnes pas encore propagées).
            </p>
          </div>

          <p v-else-if="emailClient.emailVerifiedAt" class="text-[11px] text-gray-500 dark:text-slate-400">
            Dernière vérification : <b>{{ emailStatusLabel(emailClient.emailVerifiedStatus) }}</b>
            le {{ formatDate(emailClient.emailVerifiedAt) }}.
          </p>
        </div>

        <p v-if="emailVerifyError" class="text-xs text-red-500">{{ emailVerifyError }}</p>
        <div class="flex justify-end gap-2">
          <button @click="closeEmailModal" class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">Fermer</button>
        </div>
      </div>
    </div>

    <!-- Bulk SMTP verification modal -->
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

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="px-6 py-4 space-y-2">
        <div v-for="i in 10" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!customers.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun {{ segmentNoun }} trouvé</p>
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
            <th @click="toggleSort('id')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">#<span class="text-gray-300">{{ sortGlyph('id') }}</span></span></th>
            <th @click="toggleSort('lastname')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Client<span class="text-gray-300">{{ sortGlyph('lastname') }}</span></span></th>
            <th @click="toggleSort('company')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Société<span class="text-gray-300">{{ sortGlyph('company') }}</span></span></th>
            <th class="px-4 py-2.5 font-medium">Activité</th>
            <th @click="toggleSort('email')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Email<span class="text-gray-300">{{ sortGlyph('email') }}</span></span></th>
            <th @click="toggleSort('nbOrders')" class="px-4 py-2.5 font-medium text-center cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Commandes<span class="text-gray-300">{{ sortGlyph('nbOrders') }}</span></span></th>
            <th @click="toggleSort('totalSpent')" class="px-4 py-2.5 font-medium text-right cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">CA TTC<span class="text-gray-300">{{ sortGlyph('totalSpent') }}</span></span></th>
            <th @click="toggleSort('dateAdd')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Inscrit le<span class="text-gray-300">{{ sortGlyph('dateAdd') }}</span></span></th>
            <th class="px-4 py-2.5 font-medium text-center">Statut</th>
          </tr>
          <!-- Filter row per column (PrestaShop BO style) — auto-applies with 300ms debounce -->
          <tr class="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <th class="px-2 py-1.5">
              <button
                v-if="hasActiveColFilter"
                @click="clearColFilters"
                class="text-[10px] text-primary-600 hover:underline whitespace-nowrap"
                title="Réinitialiser les filtres"
              >×</button>
            </th>
            <th class="px-2 py-1.5" />
            <th class="px-2 py-1.5"><input v-model="colFilters.fName" type="text" placeholder="Nom…" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fCompany" type="text" placeholder="Société…" class="filter-input" /></th>
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fActivite" class="filter-input">
                <option value="">Toutes</option>
                <option v-for="a in activityOptions" :key="a.code" :value="a.code">{{ a.label }}</option>
              </select>
            </th>
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
            <th class="px-2 py-1.5"><input v-model.number="colFilters.fOrdersMin" type="number" min="0" placeholder="Min" class="filter-input text-center tabular-nums" /></th>
            <th class="px-2 py-1.5" />
            <th class="px-2 py-1.5" />
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fActive" class="filter-input">
                <option value="">Tous</option>
                <option value="1">Actif</option>
                <option value="0">Inactif</option>
              </select>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in customers"
            :key="c.id"
            class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            :class="selection.has(c.id) ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''"
            @click="onRowClick(c)"
          >
            <td class="px-3 py-2.5 w-8" @click.stop>
              <input
                type="checkbox"
                :checked="selection.has(c.id)"
                @change="toggleRow(c.id)"
                class="cursor-pointer"
              />
            </td>
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ c.id }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">
              <span class="inline-flex items-center gap-1">
                <span>{{ c.firstname }} {{ c.lastname }}</span>
                <button
                  v-if="canShowLinkedin(c)"
                  type="button"
                  @click.stop="openLinkedinModal(c)"
                  :title="c.linkedinUrl ? 'LinkedIn vérifié — clic pour modifier' : `Vérifier le profil LinkedIn de ${c.firstname || ''} ${c.lastname || ''}`"
                  :class="c.linkedinUrl
                    ? 'text-[10px] px-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-0.5'
                    : 'text-[10px] px-1 rounded text-blue-600 hover:bg-blue-50'"
                >
                  <span>in</span>
                  <svg v-if="c.linkedinUrl" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                </button>
              </span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">
              <span class="inline-flex items-center gap-1">
                <span>{{ c.company || '—' }}</span>
                <a
                  v-if="inseeUrl(c)"
                  :href="inseeUrl(c)!"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[10px] px-1 rounded text-emerald-700 hover:bg-emerald-50"
                  :title="c.siret ? `Fiche INSEE ${String(c.siret).slice(0, 9)}` : `Rechercher ${c.company} sur annuaire-entreprises`"
                  @click.stop
                >🇫🇷</a>
              </span>
            </td>
            <td class="px-4 py-2.5 text-xs">
              <span v-if="c.activityCode" class="inline-block px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-medium">
                {{ activityLabel(c.activityCode) }}
              </span>
              <span v-else class="text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-400" @click.stop>
              <div class="flex items-center gap-1.5">
                <button
                  v-if="c.email"
                  @click="openEmailModal(c)"
                  class="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
                  :class="c.emailVerifiedStatus
                    ? emailStatusBadgeClass(c.emailVerifiedStatus)
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'"
                  :title="c.emailVerifiedStatus
                    ? `${emailStatusLabel(c.emailVerifiedStatus)} le ${formatDate(c.emailVerifiedAt)} — clic pour re-vérifier`
                    : 'Email non vérifié — clic pour sonder le serveur SMTP'"
                >{{ c.emailVerifiedStatus ? emailStatusGlyph(c.emailVerifiedStatus) : '?' }}</button>
                <span class="truncate">{{ c.email }}</span>
              </div>
            </td>
            <td class="px-4 py-2.5 text-center font-medium">{{ c.nbOrders || 0 }}</td>
            <td class="px-4 py-2.5 text-right font-bold">{{ formatEur(c.totalSpent) }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(c.dateAdd) }}</td>
            <td class="px-4 py-2.5 text-center">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="c.active
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-gray-100 text-gray-500'"
              >
                {{ c.active ? 'Actif' : 'Inactif' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" :label="segmentNoun + 's'" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const router = useRouter()
const route = useRoute()

const customers = ref<any[]>([])
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

// Lead/customer segmentation (actioned 2026-05-01)
// - lead   : 0 orders (prospect / account created but not converted)
// - customer : ≥ 1 validated order
// - all    : all (legacy / global view)
type Segment = 'lead' | 'client' | 'all'
const segment = ref<Segment>(
  (route.query.segment === 'lead' || route.query.segment === 'all') ? route.query.segment : 'client',
)
const segmentTitle = computed(() => {
  if (segment.value === 'lead') return 'Leads'
  if (segment.value === 'client') return 'Clients'
  return 'Contacts'
})
const segmentNoun = computed(() => {
  if (segment.value === 'lead') return 'lead'
  if (segment.value === 'client') return 'client'
  return 'contact'
})
function setSegment(s: Segment) {
  if (segment.value === s) return
  segment.value = s
  page.value = 1
  router.replace({ query: { ...route.query, segment: s } })
  load()
}
const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const newClient = reactive({ firstname: '', lastname: '', email: '', company: '', phone: '' })

// ── Import CSV (UPSERT par email) ──────────────────────────────
const importOpen = ref(false)
const importTargetFields = [
  { key: 'email', label: 'Email', required: true },
  { key: 'firstname', label: 'Prénom' },
  { key: 'lastname', label: 'Nom' },
  { key: 'company', label: 'Société' },
  { key: 'siret', label: 'SIRET' },
  { key: 'website', label: 'Site web' },
  { key: 'active', label: 'Actif' },
  { key: 'newsletter', label: 'Newsletter' },
  { key: 'optin', label: 'Optin' },
]
const importFieldAliases: Record<string, string[]> = {
  email: ['email', 'mail', 'e-mail', 'courriel'],
  firstname: ['prenom', 'prénom', 'firstname', 'first name'],
  lastname: ['nom', 'lastname', 'last name', 'name'],
  company: ['societe', 'société', 'company', 'entreprise'],
  siret: ['siret', 'siren'],
  website: ['site', 'website', 'url', 'site web'],
  active: ['actif', 'active', 'status', 'statut'],
  newsletter: ['newsletter', 'nl'],
  optin: ['optin', 'opt-in', 'consentement'],
}

// Sprint 15 — 300 ms debounce on search to keep the page
// "ultra-fast" even on 10k customers (server-side pagination and
// aggregated LEFT JOIN make the query O(perPage)).
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

async function createClient() {
  creating.value = true
  createError.value = ''
  try {
    await $fetch('/api/bo/customers/create', { method: 'POST', body: newClient })
    showCreate.value = false
    Object.assign(newClient, { firstname: '', lastname: '', email: '', company: '', phone: '' })
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

function openClient(id: number) {
  router.push(`/hub/contacts/${id}`)
}

// Server-side sorting — click on header toggles asc/desc, return to page 1.
// Persisted in `localStorage` to remain consistent between sessions.
// Default revenue desc (`totalSpent`) — `localStorage` preference takes priority.
const sortKey = ref<string>('totalSpent')
const sortDir = ref<'asc' | 'desc'>('desc')

const SORT_PREF_KEY = 'hub:contacts:sort'
function loadSortPref() {
  try {
    const raw = localStorage.getItem(SORT_PREF_KEY)
    if (!raw) return
    const obj = JSON.parse(raw)
    if (obj?.key && typeof obj.key === 'string') sortKey.value = obj.key
    if (obj?.dir === 'asc' || obj?.dir === 'desc') sortDir.value = obj.dir
  } catch { /* localStorage indispo / corrompu — on ignore */ }
}
watch([sortKey, sortDir], ([k, d]) => {
  try {
    localStorage.setItem(SORT_PREF_KEY, JSON.stringify({ key: k, dir: d }))
  } catch { /* quota plein, mode privé, etc. */ }
})
function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    // Sensible defaults: numerics desc (revenue, orders, date), text asc.
    sortDir.value = ['nbOrders', 'totalSpent', 'dateAdd', 'id'].includes(key) ? 'desc' : 'asc'
  }
  page.value = 1
  load()
}
function sortGlyph(key: string): string {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? '▲' : '▼'
}

// Column filters — 300ms debounce on server side (ported from leads UX).
const colFilters = reactive({
  fName: '' as string,
  fCompany: '' as string,
  fActivite: '' as string,
  fEmail: '' as string,
  fEmailVerified: '' as string,
  fOrdersMin: null as number | null,
  fActive: '' as string,
})
const hasActiveColFilter = computed(() => {
  return Boolean(
    colFilters.fName || colFilters.fCompany || colFilters.fActivite ||
    colFilters.fEmail || colFilters.fEmailVerified || colFilters.fActive ||
    (colFilters.fOrdersMin != null && colFilters.fOrdersMin > 0),
  )
})
function clearColFilters() {
  colFilters.fName = ''
  colFilters.fCompany = ''
  colFilters.fActivite = ''
  colFilters.fEmail = ''
  colFilters.fEmailVerified = ''
  colFilters.fOrdersMin = null
  colFilters.fActive = ''
}
let colFilterTimer: any = null
watch(colFilters, () => {
  if (colFilterTimer) clearTimeout(colFilterTimer)
  colFilterTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
}, { deep: true })

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/customers', {
      query: {
        page: page.value, perPage: perPage.value, search: search.value, segment: segment.value,
        sort: sortKey.value || undefined, dir: sortDir.value || undefined,
        fName: colFilters.fName || undefined,
        fCompany: colFilters.fCompany || undefined,
        fActivite: colFilters.fActivite || undefined,
        fEmail: colFilters.fEmail || undefined,
        fEmailVerified: colFilters.fEmailVerified || undefined,
        fOrdersMin: colFilters.fOrdersMin && colFilters.fOrdersMin > 0 ? colFilters.fOrdersMin : undefined,
        fActive: colFilters.fActive || undefined,
      },
    })
    customers.value = data.customers ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

import { CUSTOMER_ACTIVITIES } from '~/utils/customerActivity'
const activityLabelMap = Object.fromEntries(CUSTOMER_ACTIVITIES.map(a => [a.code, a.label]))
const activityOptions = CUSTOMER_ACTIVITIES
function activityLabel(code: string | null | undefined): string {
  if (!code) return ''
  return activityLabelMap[code] || code
}

// ── Multiple selection (ported from leads UX) ───────────────────────────────
const selection = reactive(new Set<number>())
const allOnPageSelected = computed(() => customers.value.length > 0 && customers.value.every(c => selection.has(c.id)))
const someOnPageSelected = computed(() => customers.value.some(c => selection.has(c.id)) && !allOnPageSelected.value)
function toggleRow(id: number) {
  if (selection.has(id)) selection.delete(id)
  else selection.add(id)
}
function togglePage() {
  if (allOnPageSelected.value) {
    for (const c of customers.value) selection.delete(c.id)
  } else {
    for (const c of customers.value) selection.add(c.id)
  }
}
function clearSelection() {
  selection.clear()
}
function onRowClick(c: any) {
  // If the user has already selected something, row click becomes toggle
  // (UX pattern "table-style"). Otherwise, click = open the record.
  if (selection.size > 0) {
    toggleRow(c.id)
    return
  }
  openClient(c.id)
}

const selectionCounts = computed(() => {
  let client = 0
  let lead = 0
  for (const c of customers.value) {
    if (!selection.has(c.id)) continue
    if (Number(c.nbOrders) > 0) client++
    else lead++
  }
  return { client, lead }
})

// ── Bulk CSV export (client-side from in-memory rows) ───────
function exportSelectionCsv() {
  const rows = customers.value.filter(c => selection.has(c.id))
  if (!rows.length) return
  const headers = ['ID', 'Prénom', 'Nom', 'Email', 'Société', 'Activité', 'Commandes', 'CA TTC', 'Inscrit le', 'Actif']
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [headers.join(';')]
  for (const c of rows) {
    lines.push([
      c.id,
      esc(c.firstname),
      esc(c.lastname),
      esc(c.email),
      esc(c.company),
      esc(activityLabel(c.activityCode)),
      Number(c.nbOrders || 0),
      Number(c.totalSpent || 0).toFixed(2).replace('.', ','),
      formatDate(c.dateAdd),
      Number(c.active) ? '1' : '0',
    ].join(';'))
  }
  const csv = '﻿' + lines.join('\r\n') // BOM UTF-8 pour Excel FR
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${segmentNoun.value}s-selection-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Bulk delete ──────────────────────────────────────────────────────
const bulkDeleteOpen = ref(false)
const bulkDeleting = ref(false)
const bulkDeleteError = ref('')
async function submitBulkDelete() {
  bulkDeleting.value = true
  bulkDeleteError.value = ''
  try {
    const ids = Array.from(selection)
    await $fetch('/api/bo/customers/bulk-delete', { method: 'POST', body: { ids } })
    bulkDeleteOpen.value = false
    clearSelection()
    await load()
  } catch (err: any) {
    bulkDeleteError.value = err?.data?.statusMessage || err?.message || 'Erreur de suppression'
  } finally {
    bulkDeleting.value = false
  }
}

// ── LinkedIn lookup + persistance ────────────────────────────────────
const linkedinClient = ref<any | null>(null)
const linkedinUrlInput = ref('')
const linkedinSaving = ref(false)
const linkedinError = ref('')
function linkedinSearchUrl(c: any): string | null {
  const parts: string[] = []
  if (c?.firstname) parts.push(String(c.firstname))
  if (c?.lastname) parts.push(String(c.lastname))
  if (c?.company) parts.push('"' + String(c.company) + '"')
  if (parts.length < 2) return null
  const q = encodeURIComponent('site:linkedin.com/in/ ' + parts.join(' '))
  return `https://www.google.com/search?q=${q}`
}

// Display LinkedIn badge inline as soon as we have at least 2 identifying tokens
// (a single name is not enough for useful search) or an already-verified URL.
function canShowLinkedin(c: any): boolean {
  if (c?.linkedinUrl) return true
  let tokens = 0
  if (c?.firstname && String(c.firstname).trim()) tokens++
  if (c?.lastname && String(c.lastname).trim()) tokens++
  if (c?.company && String(c.company).trim()) tokens++
  return tokens >= 2
}

// Annuaire-entreprises.data.gouv.fr — fiche officielle INSEE/RNE.
// Known SIREN (first 9 digits of SIRET) → direct record.
// Otherwise: search by business name if ≥ 3 characters.
function inseeUrl(c: any): string | null {
  const raw = c?.siret ? String(c.siret).replace(/\D/g, '') : ''
  if (raw.length >= 9) {
    return `https://annuaire-entreprises.data.gouv.fr/entreprise/${raw.slice(0, 9)}`
  }
  if (c?.company && String(c.company).trim().length >= 3) {
    return `https://annuaire-entreprises.data.gouv.fr/rechercher?terme=${encodeURIComponent(String(c.company).trim())}`
  }
  return null
}
function openLinkedinModal(c: any) {
  linkedinClient.value = c
  linkedinUrlInput.value = c?.linkedinUrl || ''
  linkedinError.value = ''
}
function closeLinkedinModal() {
  linkedinClient.value = null
  linkedinUrlInput.value = ''
  linkedinError.value = ''
}
async function submitLinkedin() {
  if (!linkedinClient.value || !linkedinUrlInput.value.trim()) return
  linkedinSaving.value = true
  linkedinError.value = ''
  try {
    const res = await $fetch<any>(`/api/bo/customers/${linkedinClient.value.id}/linkedin`, {
      method: 'PUT',
      body: { url: linkedinUrlInput.value.trim() },
    })
    // Local patch to reflect immediately
    const row = customers.value.find((c) => c.id === linkedinClient.value!.id)
    if (row) row.linkedinUrl = res?.url || linkedinUrlInput.value.trim()
    closeLinkedinModal()
  } catch (err: any) {
    linkedinError.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    linkedinSaving.value = false
  }
}
async function clearLinkedin() {
  if (!linkedinClient.value) return
  linkedinSaving.value = true
  linkedinError.value = ''
  try {
    await $fetch(`/api/bo/customers/${linkedinClient.value.id}/linkedin`, {
      method: 'PUT',
      body: { url: '' },
    })
    const row = customers.value.find((c) => c.id === linkedinClient.value!.id)
    if (row) row.linkedinUrl = null
    closeLinkedinModal()
  } catch (err: any) {
    linkedinError.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    linkedinSaving.value = false
  }
}

// ── Email verify (single via modal) ──────────────────────────────────
const emailClient = ref<any | null>(null)
const emailVerifying = ref(false)
const emailVerifyResult = ref<any | null>(null)
const emailVerifyError = ref('')
function openEmailModal(c: any) {
  emailClient.value = c
  emailVerifyResult.value = null
  emailVerifyError.value = ''
}
function closeEmailModal() {
  emailClient.value = null
  emailVerifyResult.value = null
  emailVerifyError.value = ''
}
async function runEmailVerify() {
  if (!emailClient.value) return
  emailVerifying.value = true
  emailVerifyError.value = ''
  try {
    const res = await $fetch<any>(`/api/bo/customers/${emailClient.value.id}/email-verify`, {
      method: 'POST',
      timeout: 12000,
    })
    emailVerifyResult.value = res
    // Local patch to refresh badges
    const row = customers.value.find((c) => c.id === emailClient.value!.id)
    if (row) {
      row.emailVerifiedStatus = res?.status
      row.emailVerifiedAt = res?.verifiedAt
    }
  } catch (err: any) {
    emailVerifyError.value = err?.data?.statusMessage || err?.message || 'Erreur'
  } finally {
    emailVerifying.value = false
  }
}

// ── Email verify (bulk) ──────────────────────────────────────────────
const bulkVerifyOpen = ref(false)
const bulkVerifyRunning = ref(false)
const bulkVerifyShouldStop = ref(false)
const bulkVerifyTotal = ref(0)
const bulkVerifyDone = ref(0)
const bulkVerifyCurrent = ref('')
const bulkVerifyError = ref('')
const bulkVerifyCounts = reactive({ ok: 0, rejected: 0, unknown: 0, errors: 0 })
const selectionEmailCount = computed(() => customers.value.filter(c => selection.has(c.id) && c.email).length)

function openBulkVerify() {
  if (!selectionEmailCount.value) return
  bulkVerifyTotal.value = selectionEmailCount.value
  bulkVerifyDone.value = 0
  Object.assign(bulkVerifyCounts, { ok: 0, rejected: 0, unknown: 0, errors: 0 })
  bulkVerifyError.value = ''
  bulkVerifyShouldStop.value = false
  bulkVerifyOpen.value = true
}
function closeBulkVerify() {
  if (bulkVerifyRunning.value) bulkVerifyShouldStop.value = true
  bulkVerifyOpen.value = false
}
async function runBulkVerify() {
  const targets = customers.value.filter((c) => selection.has(c.id) && c.email)
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
      const c = queue.shift()
      if (!c) break
      bulkVerifyCurrent.value = c.email
      try {
        const res = await $fetch<any>(`/api/bo/customers/${c.id}/email-verify`, {
          method: 'POST',
          timeout: 12000,
        })
        const status = String(res?.status || 'unknown')
        if (status === 'ok') bulkVerifyCounts.ok++
        else if (status === 'rejected' || status === 'mx_missing') bulkVerifyCounts.rejected++
        else bulkVerifyCounts.unknown++
        const row = customers.value.find((r) => r.id === c.id)
        if (row) {
          row.emailVerifiedStatus = status
          row.emailVerifiedAt = res?.verifiedAt
        }
      } catch (err: any) {
        bulkVerifyCounts.errors++
        console.warn('[bulk-verify]', c.email, err?.message)
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

// ── Helpers status email ─────────────────────────────────────────────
const EMAIL_STATUS_LABELS: Record<string, string> = {
  ok: 'Vérifié',
  rejected: 'Rejeté',
  mx_missing: 'MX absent',
  unknown: 'Inconcluant',
  error: 'Erreur',
}
function emailStatusLabel(s: string | null | undefined): string {
  if (!s) return '—'
  return EMAIL_STATUS_LABELS[s] || s
}
function emailStatusGlyph(s: string | null | undefined): string {
  if (s === 'ok') return '✓'
  if (s === 'rejected' || s === 'mx_missing') return '✗'
  if (s === 'unknown') return '?'
  return '·'
}
function emailStatusBadgeClass(s: string | null | undefined): string {
  if (s === 'ok') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
  if (s === 'rejected' || s === 'mx_missing') return 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300'
  if (s === 'unknown') return 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
  return 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
}
function emailStatusTextClass(s: string | null | undefined): string {
  if (s === 'ok') return 'text-emerald-700 dark:text-emerald-300'
  if (s === 'rejected' || s === 'mx_missing') return 'text-red-700 dark:text-red-300'
  if (s === 'unknown') return 'text-amber-700 dark:text-amber-300'
  return 'text-gray-600 dark:text-slate-400'
}

onMounted(() => {
  loadSortPref()
  load()
})
</script>

<style scoped>
.filter-input {
  @apply w-full text-[11px] border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary-300;
}
</style>
