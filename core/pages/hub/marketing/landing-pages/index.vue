<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Landing pages</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ total }} page{{ total > 1 ? 's' : '' }} institutionnelle{{ total > 1 ? 's' : '' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button @click="setStatus('')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === '' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">Toutes</button>
          <button @click="setStatus('active')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'">En ligne</button>
          <button @click="setStatus('draft')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 'draft' ? 'bg-gray-500 text-white' : 'text-gray-600 hover:bg-gray-50'">Brouillons</button>
        </div>
        <HubLangSelector aria-label="Langue d'affichage des pages" />
        <input
          v-model="search"
          type="text"
          placeholder="Titre, URL…"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <NuxtLink
          to="/hub/marketing/landing-pages/new"
          class="text-xs px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          + Nouvelle page
        </NuxtLink>
      </div>
    </header>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="pages"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto">
      <div v-if="loading && !pages.length" class="px-6 py-4 space-y-2">
        <div v-for="i in 8" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!pages.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucune page</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium">#</th>
            <th class="px-4 py-2.5 font-medium">Titre</th>
            <th class="px-4 py-2.5 font-medium">URL</th>
            <th class="px-4 py-2.5 font-medium">Mise à jour</th>
            <th class="px-4 py-2.5 font-medium text-center">Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in pages"
            :key="p.id"
            class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            @click="openPage(p.id)"
          >
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ p.id }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100 font-medium truncate max-w-lg">
              {{ p.title || '— Sans titre —' }}
            </td>
            <td class="px-4 py-2.5 text-xs font-mono text-gray-400 truncate max-w-xs">
              /{{ p.linkRewrite || '—' }}
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(p.dateUpd) }}</td>
            <td class="px-4 py-2.5 text-center">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="p.active
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-gray-100 text-gray-500'"
              >
                {{ p.active ? 'En ligne' : 'Brouillon' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="pages" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('intelligence')) {
  navigateTo('/hub/dashboard')
}

const router = useRouter()
const { currentLangId } = useHubLang()

const pages = ref<any[]>([])
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
const statusFilter = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

function setStatus(s: string) {
  statusFilter.value = s
  page.value = 1
  load()
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

function openPage(id: number) {
  router.push(`/hub/marketing/landing-pages/${id}`)
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/marketing/landing-pages', {
      query: {
        page: page.value,
        perPage: perPage.value,
        search: search.value,
        status: statusFilter.value,
        lang: currentLangId.value,
      },
    })
    pages.value = data.pages ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }

onMounted(load)

watch(currentLangId, (newId, oldId) => {
  if (newId !== oldId && !loading.value) load()
})
</script>
