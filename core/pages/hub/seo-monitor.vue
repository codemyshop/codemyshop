<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later
-->
<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth' })

useHead({ title: 'SEO Monitor — Bot Tracking' })

const { data: stats, refresh } = await useFetch('/api/bot-stats')

const botColors: Record<string, string> = {
  Google: 'bg-blue-500',
  Bing: 'bg-cyan-500',
  GPTBot: 'bg-emerald-500',
  ClaudeBot: 'bg-orange-500',
  Anthropic: 'bg-orange-400',
  Facebook: 'bg-indigo-500',
  Twitter: 'bg-sky-400',
  LinkedIn: 'bg-blue-700',
  Apple: 'bg-gray-400',
  Semrush: 'bg-orange-600',
  Ahrefs: 'bg-blue-600',
  DuckDuckGo: 'bg-red-500',
  Amazon: 'bg-yellow-500',
}

function getBotColor(name: string) {
  return botColors[name] || 'bg-violet-500'
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `il y a ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">SEO Monitor</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Activité des bots sur les 7 derniers jours</p>
      </div>
      <button
        class="px-4 py-2 text-sm font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
        @click="refresh()"
      >
        Rafraîchir
      </button>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total crawls</p>
        <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">{{ stats?.total || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bots distincts</p>
        <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">{{ stats?.bots?.length || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pages crawlées</p>
        <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">{{ stats?.topUrls?.length || 0 }}</p>
      </div>
    </div>

    <!-- Bots table -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden mb-8">
      <div class="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
        <h2 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Activité par bot</h2>
      </div>
      <div class="divide-y divide-gray-100 dark:divide-slate-700">
        <div
          v-for="bot in stats?.bots || []"
          :key="bot.name"
          class="flex items-center justify-between px-5 py-3"
        >
          <div class="flex items-center gap-3">
            <span :class="[getBotColor(bot.name), 'w-2.5 h-2.5 rounded-full']" />
            <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ bot.name }}</span>
          </div>
          <div class="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span><strong class="text-gray-900 dark:text-white">{{ bot.hits }}</strong> hits</span>
            <span>{{ bot.uniqueUrls }} pages</span>
            <span class="text-xs">{{ timeAgo(bot.lastSeen) }}</span>
          </div>
        </div>
        <div v-if="!stats?.bots?.length" class="px-5 py-8 text-center text-gray-400 text-sm">
          Aucune donnée de crawl. Le tracking démarre après le deploy.
        </div>
      </div>
    </div>

    <!-- Top URLs -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
        <h2 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Top pages crawlées</h2>
      </div>
      <div class="divide-y divide-gray-100 dark:divide-slate-700">
        <div
          v-for="u in stats?.topUrls || []"
          :key="u.url"
          class="flex items-center justify-between px-5 py-2.5"
        >
          <span class="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[70%]">{{ u.url }}</span>
          <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ u.count }}x</span>
        </div>
      </div>
    </div>
  </div>
</template>
