<!--
  /hub/carts/abandoned — Relance (paniers abandonnés + devis non transformés).

  2 tabs :
    - Paniers : ps_cart non convertis (aucun ps_orders.id_cart match), filtres
      âge / valeur / cooldown, mode test, bouton « Relancer ».
    - Devis   : cs_quote_request status='pending', filtres âge / valeur,
      mode test, bouton « Relancer ».

  Les deux tabs poussent en queue cs_email_queue (templates DB
  cart_recovery / quote_followup) — visibles dans /hub/crm/email tab Queue.

  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Relance</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          <template v-if="activeTab === 'carts'">{{ counters.total }} panier{{ counters.total > 1 ? 's' : '' }} abandonné{{ counters.total > 1 ? 's' : '' }} · valeur potentielle {{ formatEur(counters.value_total) }}</template>
          <template v-else>{{ qCounters.total }} devis pending · valeur potentielle {{ formatEur(qCounters.value_total) }}</template>
        </p>
      </div>
      <div class="flex items-center gap-3">
        <label v-if="activeTab === 'carts'" class="flex items-center gap-2 cursor-pointer">
          <span class="text-xs text-gray-500">Manuel</span>
          <button
            type="button"
            @click="toggleAuto"
            class="relative w-10 h-5 rounded-full transition-colors"
            :class="config.auto ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'"
            :title="config.auto ? 'Cron auto activé' : 'Cron auto désactivé (manuel uniquement)'"
          >
            <span class="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" :class="config.auto ? 'translate-x-5' : 'translate-x-0.5'"></span>
          </button>
          <span class="text-xs font-semibold" :class="config.auto ? 'text-emerald-600' : 'text-gray-500'">Auto (cron)</span>
        </label>
        <button @click="reload" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">↻ Actualiser</button>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 flex items-center gap-1 shrink-0" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'carts'"
        :class="[
          'relative text-xs px-4 py-3 -mb-px border-b-2 transition-colors font-medium whitespace-nowrap',
          activeTab === 'carts'
            ? 'border-primary-600 text-primary-700 dark:text-primary-400 font-bold'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200'
        ]"
        @click="activeTab = 'carts'"
      >
        🛒 Paniers
        <span v-if="counters.total" class="ml-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">{{ counters.total }}</span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'quotes'"
        :class="[
          'relative text-xs px-4 py-3 -mb-px border-b-2 transition-colors font-medium whitespace-nowrap',
          activeTab === 'quotes'
            ? 'border-primary-600 text-primary-700 dark:text-primary-400 font-bold'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200'
        ]"
        @click="activeTab = 'quotes'"
      >
        📋 Devis
        <span v-if="qCounters.total" class="ml-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">{{ qCounters.total }}</span>
      </button>
    </nav>

    <!-- ═══ TAB : PANIERS ═══════════════════════════════════════════════ -->
    <template v-if="activeTab === 'carts'">
      <!-- Counters -->
      <div class="px-6 py-4 grid grid-cols-2 md:grid-cols-7 gap-3 shrink-0 bg-gray-50 dark:bg-slate-950">
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1">1-24h</p>
          <p class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ counters.bucket_1_24h }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1">1-3 j</p>
          <p class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ counters.bucket_1_3d }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1">3-7 j</p>
          <p class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ counters.bucket_3_7d }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1">+7 j</p>
          <p class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ counters.bucket_7d_plus }}</p>
        </div>
        <div class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Valeur potent.</p>
          <p class="text-lg font-bold text-emerald-700 dark:text-emerald-300">{{ formatEur(counters.value_total) }}</p>
        </div>
        <div class="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">Relancés 24h</p>
          <p class="text-lg font-bold text-violet-700 dark:text-violet-300">{{ counters.sent_24h }}</p>
        </div>
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Convertis</p>
          <p class="text-lg font-bold text-blue-700 dark:text-blue-300">{{ counters.total_converted }}</p>
        </div>
      </div>

      <!-- Filtres + actions panier -->
      <div class="px-6 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shrink-0 flex items-center gap-3 flex-wrap">
        <label class="text-xs text-gray-600 dark:text-slate-300">
          Âge min (h)
          <input v-model.number="filters.ageMinH" type="number" min="1" class="ml-1 w-16 text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" @change="loadCarts" />
        </label>
        <label class="text-xs text-gray-600 dark:text-slate-300">
          Âge max (h)
          <input v-model.number="filters.ageMaxH" type="number" min="1" class="ml-1 w-20 text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" @change="loadCarts" />
        </label>
        <label class="text-xs text-gray-600 dark:text-slate-300">
          Valeur min (€)
          <input v-model.number="filters.valueMin" type="number" min="0" class="ml-1 w-20 text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" @change="loadCarts" />
        </label>
        <label class="text-xs text-gray-600 dark:text-slate-300">
          Cooldown (j)
          <input v-model.number="filters.cooldownDays" type="number" min="1" class="ml-1 w-14 text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" @change="loadCarts" />
        </label>
        <label class="flex items-center gap-1 text-xs text-gray-600 dark:text-slate-300 cursor-pointer">
          <input v-model="filters.onlyEligible" type="checkbox" @change="loadCarts" class="rounded text-primary-600 focus:ring-primary-500" />
          Exclure paniers récemment relancés
        </label>

        <div class="ml-auto flex items-center gap-2">
          <label class="flex items-center gap-1.5 text-xs cursor-pointer" :class="testMode ? 'text-amber-600 font-semibold' : 'text-gray-500'">
            <input v-model="testMode" type="checkbox" class="rounded text-amber-500 focus:ring-amber-400" />
            🧪 Test
          </label>
          <input
            v-if="testMode"
            v-model="testEmail"
            type="email"
            placeholder="email-test@…"
            class="text-xs border border-amber-300 dark:border-amber-700 rounded px-2 py-1 bg-amber-50 dark:bg-amber-900/20 w-52 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <span v-if="selectedIds.size > 0" class="text-xs text-gray-500">{{ selectedIds.size }} sélectionné{{ selectedIds.size > 1 ? 's' : '' }}</span>
          <button
            @click="sendCarts"
            :disabled="selectedIds.size === 0 || sending || (testMode && !isValidEmail(testEmail))"
            class="text-xs px-3 py-1.5 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            :class="testMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary-600 hover:bg-primary-700'"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
            {{ sending ? 'Envoi…' : (testMode ? `Tester ${selectedIds.size || 'X'} mails` : `Relancer ${selectedIds.size || 'X'}`) }}
          </button>
        </div>
      </div>

      <!-- Liste paniers -->
      <div class="flex-1 overflow-auto">
        <div v-if="loadingCarts" class="px-6 py-4 space-y-2">
          <div v-for="i in 8" :key="i" class="h-12 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div v-else-if="!carts.length" class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4">🛒</div>
          <p class="text-sm font-semibold text-gray-700 dark:text-slate-300">Aucun panier abandonné dans cette tranche</p>
          <p class="text-xs text-gray-400 mt-2">Ajuste les filtres ou actualise.</p>
        </div>
        <table v-else class="w-full text-sm">
          <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium w-8">
                <input type="checkbox" :checked="allCartsSelected" @change="toggleAllCarts" class="rounded text-primary-600 focus:ring-primary-500" />
              </th>
              <th class="px-4 py-2.5 font-medium">#</th>
              <th class="px-4 py-2.5 font-medium">Client</th>
              <th class="px-4 py-2.5 font-medium">Société</th>
              <th class="px-4 py-2.5 font-medium">Activité</th>
              <th class="px-4 py-2.5 font-medium text-center">Articles</th>
              <th class="px-4 py-2.5 font-medium text-right">Valeur HT</th>
              <th class="px-4 py-2.5 font-medium">Âge</th>
              <th class="px-4 py-2.5 font-medium">Dernier mail</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in carts" :key="c.id_cart"
              class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              @click="toggleCart(c.id_cart)"
            >
              <td class="px-4 py-2.5" @click.stop>
                <input type="checkbox" :checked="selectedIds.has(c.id_cart)" @change="toggleCart(c.id_cart)" class="rounded text-primary-600 focus:ring-primary-500" />
              </td>
              <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ c.id_cart }}</td>
              <td class="px-4 py-2.5">
                <div class="font-medium text-gray-800 dark:text-slate-100">{{ c.customer_name }}</div>
                <div class="text-[10px] text-gray-400">{{ c.email }}</div>
              </td>
              <td class="px-4 py-2.5 text-xs text-gray-500">{{ c.company || '—' }}</td>
              <td class="px-4 py-2.5 text-xs">
                <span v-if="c.activity_code" class="inline-block px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-medium">
                  {{ activityLabel(c.activity_code) }}
                </span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-4 py-2.5 text-center font-medium">{{ c.items_count }}</td>
              <td class="px-4 py-2.5 text-right font-bold">{{ formatEur(c.total_estimated) }}</td>
              <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatAgeHours(c.age_hours) }}</td>
              <td class="px-4 py-2.5 text-xs">
                <span v-if="c.last_sent_at" class="text-amber-600">Le {{ formatDate(c.last_sent_at) }}</span>
                <span v-else class="text-gray-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ═══ TAB : DEVIS ═════════════════════════════════════════════════ -->
    <template v-else-if="activeTab === 'quotes'">
      <!-- Counters quotes -->
      <div class="px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0 bg-gray-50 dark:bg-slate-950">
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1">0-3 j</p>
          <p class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ qCounters.bucket_0_3d }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1">3-7 j</p>
          <p class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ qCounters.bucket_3_7d }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1">7-30 j</p>
          <p class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ qCounters.bucket_7_30d }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1">+30 j</p>
          <p class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ qCounters.bucket_30d_plus }}</p>
        </div>
        <div class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-3">
          <p class="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Valeur potent.</p>
          <p class="text-lg font-bold text-emerald-700 dark:text-emerald-300">{{ formatEur(qCounters.value_total) }}</p>
        </div>
      </div>

      <!-- Filtres + actions devis -->
      <div class="px-6 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shrink-0 flex items-center gap-3 flex-wrap">
        <label class="text-xs text-gray-600 dark:text-slate-300">
          Âge min (j)
          <input v-model.number="qFilters.ageMinDays" type="number" min="0" class="ml-1 w-16 text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" @change="loadQuotes" />
        </label>
        <label class="text-xs text-gray-600 dark:text-slate-300">
          Âge max (j)
          <input v-model.number="qFilters.ageMaxDays" type="number" min="1" class="ml-1 w-16 text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" @change="loadQuotes" />
        </label>
        <label class="text-xs text-gray-600 dark:text-slate-300">
          Valeur min (€)
          <input v-model.number="qFilters.valueMin" type="number" min="0" class="ml-1 w-20 text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" @change="loadQuotes" />
        </label>

        <div class="ml-auto flex items-center gap-2">
          <label class="flex items-center gap-1.5 text-xs cursor-pointer" :class="testMode ? 'text-amber-600 font-semibold' : 'text-gray-500'">
            <input v-model="testMode" type="checkbox" class="rounded text-amber-500 focus:ring-amber-400" />
            🧪 Test
          </label>
          <input
            v-if="testMode"
            v-model="testEmail"
            type="email"
            placeholder="email-test@…"
            class="text-xs border border-amber-300 dark:border-amber-700 rounded px-2 py-1 bg-amber-50 dark:bg-amber-900/20 w-52 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <span v-if="selectedQuoteIds.size > 0" class="text-xs text-gray-500">{{ selectedQuoteIds.size }} sélectionné{{ selectedQuoteIds.size > 1 ? 's' : '' }}</span>
          <button
            @click="sendQuotes"
            :disabled="selectedQuoteIds.size === 0 || sending || (testMode && !isValidEmail(testEmail))"
            class="text-xs px-3 py-1.5 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            :class="testMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary-600 hover:bg-primary-700'"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
            {{ sending ? 'Envoi…' : (testMode ? `Tester ${selectedQuoteIds.size || 'X'} mails` : `Relancer ${selectedQuoteIds.size || 'X'}`) }}
          </button>
        </div>
      </div>

      <!-- Liste devis -->
      <div class="flex-1 overflow-auto">
        <div v-if="loadingQuotes" class="px-6 py-4 space-y-2">
          <div v-for="i in 8" :key="i" class="h-12 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div v-else-if="!quotes.length" class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4">📋</div>
          <p class="text-sm font-semibold text-gray-700 dark:text-slate-300">Aucun devis pending dans cette tranche</p>
          <p class="text-xs text-gray-400 mt-2">Ajuste les filtres ou actualise.</p>
        </div>
        <table v-else class="w-full text-sm">
          <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium w-8">
                <input type="checkbox" :checked="allQuotesSelected" @change="toggleAllQuotes" class="rounded text-primary-600 focus:ring-primary-500" />
              </th>
              <th class="px-4 py-2.5 font-medium">Réf.</th>
              <th class="px-4 py-2.5 font-medium">Contact</th>
              <th class="px-4 py-2.5 font-medium">Société</th>
              <th class="px-4 py-2.5 font-medium">Activité</th>
              <th class="px-4 py-2.5 font-medium text-center">Produits</th>
              <th class="px-4 py-2.5 font-medium text-right">Valeur HT</th>
              <th class="px-4 py-2.5 font-medium">Âge</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="q in quotes" :key="q.id_quote_request"
              class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              @click="toggleQuote(q.id_quote_request)"
            >
              <td class="px-4 py-2.5" @click.stop>
                <input type="checkbox" :checked="selectedQuoteIds.has(q.id_quote_request)" @change="toggleQuote(q.id_quote_request)" class="rounded text-primary-600 focus:ring-primary-500" />
              </td>
              <td class="px-4 py-2.5 font-mono text-xs text-gray-500">Q-{{ q.id_quote_request }}</td>
              <td class="px-4 py-2.5">
                <div class="font-medium text-gray-800 dark:text-slate-100">{{ (q.firstname + ' ' + q.lastname).trim() || '—' }}</div>
                <div class="text-[10px] text-gray-400">{{ q.email }}</div>
              </td>
              <td class="px-4 py-2.5 text-xs text-gray-500">{{ q.company || '—' }}</td>
              <td class="px-4 py-2.5 text-xs text-gray-500">{{ q.activite || '—' }}</td>
              <td class="px-4 py-2.5 text-center font-medium">{{ q.items_count }}</td>
              <td class="px-4 py-2.5 text-right font-bold">{{ formatEur(q.total_estimated) }}</td>
              <td class="px-4 py-2.5 text-xs text-gray-500">{{ q.age_days }}j</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Result banner (common to both tabs) -->
    <div v-if="sendResult" class="px-6 py-3 border-t text-xs"
      :class="sendResult.test_mode ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-300'">
      <span v-if="sendResult.test_mode">🧪 <strong>Mode TEST</strong> — </span>
      <span v-else>✅ </span>
      {{ sendResult.sent }} relance{{ sendResult.sent > 1 ? 's' : '' }} mise{{ sendResult.sent > 1 ? 's' : '' }} en queue<span v-if="sendResult.errors"> · {{ sendResult.errors }} erreur(s)</span>
      <span v-if="sendResult.test_mode"> à {{ testEmail }} (clients réels non touchés)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

import { CUSTOMER_ACTIVITIES } from '~/utils/customerActivity'
const activityLabelMap = Object.fromEntries(CUSTOMER_ACTIVITIES.map(a => [a.code, a.label]))
function activityLabel(code: string) { return activityLabelMap[code] || code }

type Tab = 'carts' | 'quotes'
const activeTab = ref<Tab>('carts')

// ── Paniers ──────────────────────────────────────────────────────────────
interface Cart {
  id_cart: number
  id_customer: number
  customer_name: string
  email: string
  company: string | null
  activity_code: string | null
  items_count: number
  total_estimated: number
  age_hours: number
  last_sent_at: string | null
  date_upd: string
}
const carts = ref<Cart[]>([])
const counters = ref<any>({})
const config = ref<any>({ auto: false, ageMinH: 24, ageMaxH: 168, valueMin: 0, cooldownDays: 7 })
const filters = reactive({ ageMinH: 24, ageMaxH: 720, valueMin: 0, cooldownDays: 7, onlyEligible: true })
const selectedIds = ref<Set<number>>(new Set())
const loadingCarts = ref(true)

// ── Devis ────────────────────────────────────────────────────────────────
interface Quote {
  id_quote_request: number
  firstname: string
  lastname: string
  email: string
  phone: string | null
  company: string | null
  siret: string | null
  activite: string | null
  message: string | null
  status: string
  date_add: string
  age_days: number
  items_count: number
  total_estimated: number
}
const quotes = ref<Quote[]>([])
const qCounters = ref<any>({})
const qFilters = reactive({ ageMinDays: 0, ageMaxDays: 90, valueMin: 0 })
const selectedQuoteIds = ref<Set<number>>(new Set())
const loadingQuotes = ref(true)

// ── Mode test (commun) ───────────────────────────────────────────────────
const sending = ref(false)
const sendResult = ref<{ sent: number; errors: number; test_mode?: boolean } | null>(null)
const testMode = ref(false)
const testEmail = ref('contact@codemyshop.com')

function isValidEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }

const allCartsSelected = computed(() => carts.value.length > 0 && carts.value.every(c => selectedIds.value.has(c.id_cart)))
const allQuotesSelected = computed(() => quotes.value.length > 0 && quotes.value.every(q => selectedQuoteIds.value.has(q.id_quote_request)))

function toggleCart(id: number) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedIds.value = s
}
function toggleAllCarts() {
  if (allCartsSelected.value) selectedIds.value = new Set()
  else selectedIds.value = new Set(carts.value.map(c => c.id_cart))
}
function toggleQuote(id: number) {
  const s = new Set(selectedQuoteIds.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedQuoteIds.value = s
}
function toggleAllQuotes() {
  if (allQuotesSelected.value) selectedQuoteIds.value = new Set()
  else selectedQuoteIds.value = new Set(quotes.value.map(q => q.id_quote_request))
}

function formatEur(n: number) {
  return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
function formatAgeHours(h: number) {
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}
function formatDate(d: string) {
  if (!d) return ''
  const dt = new Date(String(d).replace(' ', 'T'))
  return dt.toLocaleDateString('fr-FR') + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

async function loadConfig() {
  try {
    const r = await $fetch<any>('/api/bo/abandoned-carts/config')
    config.value = r
    Object.assign(filters, { ageMinH: r.ageMinH, ageMaxH: r.ageMaxH, valueMin: r.valueMin, cooldownDays: r.cooldownDays })
  } catch (e) { console.error('config load failed', e) }
}

async function loadCarts() {
  loadingCarts.value = true
  selectedIds.value = new Set()
  try {
    const r = await $fetch<any>('/api/bo/abandoned-carts', { query: { ...filters, onlyEligible: filters.onlyEligible ? 1 : 0 } })
    carts.value = r.carts || []
    counters.value = r.counters || {}
  } catch (e) { console.error('carts load failed', e); carts.value = [] }
  finally { loadingCarts.value = false }
}

async function loadQuotes() {
  loadingQuotes.value = true
  selectedQuoteIds.value = new Set()
  try {
    const r = await $fetch<any>('/api/bo/quote-followup', { query: qFilters })
    quotes.value = r.quotes || []
    qCounters.value = r.counters || {}
  } catch (e) { console.error('quotes load failed', e); quotes.value = [] }
  finally { loadingQuotes.value = false }
}

function reload() {
  if (activeTab.value === 'carts') loadCarts()
  else loadQuotes()
}

async function toggleAuto() {
  const newAuto = !config.value.auto
  try {
    await $fetch('/api/bo/abandoned-carts/config', { method: 'PUT', body: { auto: newAuto } })
    config.value = { ...config.value, auto: newAuto }
  } catch (e) { console.error('toggle auto failed', e); alert('Erreur changement de mode') }
}

async function sendCarts() {
  if (selectedIds.value.size === 0) return
  if (testMode.value && !isValidEmail(testEmail.value)) { alert('Email de test invalide'); return }
  const msg = testMode.value
    ? `MODE TEST — Envoyer ${selectedIds.value.size} mail(s) à ${testEmail.value} ? (clients réels non touchés)`
    : `Envoyer ${selectedIds.value.size} relance(s) panier aux CLIENTS ?`
  if (!confirm(msg)) return
  sending.value = true; sendResult.value = null
  try {
    const body: any = { id_carts: [...selectedIds.value] }
    if (testMode.value) body.test_email = testEmail.value
    const r = await $fetch<{ sent: number; errors: number; test_mode?: boolean }>('/api/bo/abandoned-carts/send', { method: 'POST', body })
    sendResult.value = r
    if (!testMode.value) selectedIds.value = new Set()
    await loadCarts()
  } catch (e: any) { console.error('send failed', e); alert('Erreur envoi : ' + (e?.data?.message || e?.message)) }
  finally { sending.value = false }
}

async function sendQuotes() {
  if (selectedQuoteIds.value.size === 0) return
  if (testMode.value && !isValidEmail(testEmail.value)) { alert('Email de test invalide'); return }
  const msg = testMode.value
    ? `MODE TEST — Envoyer ${selectedQuoteIds.value.size} mail(s) à ${testEmail.value} ? (clients réels non touchés)`
    : `Envoyer ${selectedQuoteIds.value.size} relance(s) devis aux CLIENTS ?`
  if (!confirm(msg)) return
  sending.value = true; sendResult.value = null
  try {
    const body: any = { id_quotes: [...selectedQuoteIds.value] }
    if (testMode.value) body.test_email = testEmail.value
    const r = await $fetch<{ sent: number; errors: number; test_mode?: boolean }>('/api/bo/quote-followup/send', { method: 'POST', body })
    sendResult.value = r
    if (!testMode.value) selectedQuoteIds.value = new Set()
    await loadQuotes()
  } catch (e: any) { console.error('send failed', e); alert('Erreur envoi : ' + (e?.data?.message || e?.message)) }
  finally { sending.value = false }
}

onMounted(async () => {
  await loadConfig()
  await Promise.all([loadCarts(), loadQuotes()])
})
</script>
