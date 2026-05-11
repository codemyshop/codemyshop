<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">File d'attente Blog IA</h1>
        <p class="text-xs text-gray-400 mt-0.5">Rédactions IA (Claude CLI) — relecture, application et publication</p>
      </div>
      <button
        @click="loadQueue"
        :disabled="loading"
        class="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
      >
        <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        Rafraîchir
      </button>
    </header>

    
    <div class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-3 flex items-center gap-6 shrink-0">
      <div v-for="stat in computedStats" :key="stat.label" class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full" :class="stat.dot" />
        <span class="text-xs text-gray-500">{{ stat.label }}</span>
        <span class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ stat.count }}</span>
      </div>
    </div>

    
    <div class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-2.5 flex items-center gap-1 shrink-0">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        @click="filterStatus = tab.value"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        :class="filterStatus === tab.value
          ? 'bg-primary-50 text-primary-600'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-slate-200'"
      >
        {{ tab.label }}
        <span class="ml-1 font-normal text-gray-400">({{ getCountByStatus(tab.value) }})</span>
      </button>
      <div class="ml-auto">
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher un titre…"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>
    </div>

    
    <div class="flex-1 overflow-auto px-6 py-4">

      <div v-if="loading && !queue.length" class="space-y-2">
        <div v-for="i in 8" :key="i" class="h-12 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
      </div>

      <div v-else-if="!filtered.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg class="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        <p class="text-sm">Aucun article dans la queue</p>
        <p class="text-xs mt-1">Les rédactions IA apparaissent ici quand vous cliquez "Rédaction IA" depuis un article</p>
      </div>

      <div v-else class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-slate-800 bg-gray-50">
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-12">#</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500">Titre</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-24">Mots</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-20">FAQ</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-28">Statut</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-20">Cover</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-32">Date</th>
              <th class="w-16 px-4 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="article in filtered"
              :key="article.id"
              class="hover:bg-gray-50 transition-colors group"
            >
              <td class="px-4 py-3 text-gray-400 text-xs">{{ article.id_cms }}</td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800 dark:text-slate-100 truncate max-w-xs" :title="article.title">
                  {{ article.title }}
                </p>
                <p class="text-[10px] text-gray-400 font-mono truncate max-w-xs mt-0.5">{{ article.slug }}</p>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs font-mono">{{ article.word_count || '—' }}</td>
              <td class="px-4 py-3 text-gray-500 text-xs font-mono">{{ article.faq_count || '—' }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                  :class="STATUS_CONFIG[article.status]?.badge || 'bg-gray-50 text-gray-500 border-gray-200'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="STATUS_CONFIG[article.status]?.dot || 'bg-gray-400'" />
                  {{ STATUS_CONFIG[article.status]?.label || article.status }}
                </span>
                <p v-if="article.error_msg && article.status === 'error'" class="text-[10px] text-red-500 mt-1 max-w-xs truncate" :title="article.error_msg">
                  {{ article.error_msg }}
                </p>
              </td>
              <td class="px-4 py-3">
                <span v-if="article.cover_url && article.cover_status === 'done'" class="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span v-else class="text-[10px] text-gray-400">—</span>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(article.date_add) }}</td>
              <td class="px-4 py-3 flex items-center gap-1">
                <NuxtLink
                  :to="`/hub/marketing/blog/${article.id_cms}`"
                  class="opacity-0 group-hover:opacity-100 text-xs px-2.5 py-1 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-500 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-all"
                >
                  Ouvrir
                </NuxtLink>
                <button
                  v-if="article.status === 'error'"
                  @click="retryArticle(article)"
                  class="opacity-0 group-hover:opacity-100 text-xs px-2.5 py-1 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all"
                >
                  Relancer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

interface QueueItem {
  id: number
  id_cms: number
  title: string
  slug: string
  meta_description: string
  instructions: string
  status: 'pending' | 'processing' | 'done' | 'error'
  word_count: number
  faq_count: number
  error_msg: string
  cover_url: string
  cover_status: string
  date_add: string
  date_upd: string
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  pending:    { label: 'En attente',  badge: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-400'   },
  processing: { label: 'En cours',   badge: 'bg-violet-50 text-violet-700 border-violet-200',   dot: 'bg-violet-400'  },
  done:       { label: 'Terminé',    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  error:      { label: 'Erreur',     badge: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-400'     },
}

const STATUS_TABS = [
  { value: '',           label: 'Tous'       },
  { value: 'pending',    label: 'En attente' },
  { value: 'processing', label: 'En cours'   },
  { value: 'done',       label: 'Terminés'   },
  { value: 'error',      label: 'Erreurs'    },
]

const queue        = ref<QueueItem[]>([])
const loading      = ref(false)
const filterStatus = ref('')
const search       = ref('')

const filtered = computed(() => {
  let list = queue.value
  if (filterStatus.value) list = list.filter(a => a.status === filterStatus.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(a => a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q))
  }
  return list
})

const computedStats = computed(() => [
  { label: 'Total',      count: queue.value.length,                                           dot: 'bg-gray-400'    },
  { label: 'En attente', count: queue.value.filter(a => a.status === 'pending').length,       dot: 'bg-amber-400'   },
  { label: 'Terminés',   count: queue.value.filter(a => a.status === 'done').length,          dot: 'bg-emerald-400' },
  { label: 'Erreurs',    count: queue.value.filter(a => a.status === 'error').length,         dot: 'bg-red-400'     },
])

const formatDate = (d: string) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getCountByStatus = (status: string) =>
  status ? queue.value.filter(a => a.status === status).length : queue.value.length

const loadQueue = async () => {
  loading.value = true
  try {
    const res = await $fetch<{ queue: QueueItem[] }>('/api/bo/marketing/blog/queue')
    queue.value = res.queue ?? []
  } catch {
    queue.value = []
  } finally {
    loading.value = false
  }
}

async function retryArticle(article: QueueItem) {
  try {
    await $fetch('/api/bo/marketing/blog/generate-content', {
      method: 'POST',
      body: {
        id_cms: article.id_cms,
        title: article.title,
        slug: article.slug,
        metaDescription: article.meta_description,
      },
    })
    
    article.status = 'pending'
    article.error_msg = ''
  } catch {  }
}

onMounted(loadQueue)
</script>
