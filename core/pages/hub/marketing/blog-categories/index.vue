<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Catégories blog</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ filtered.length }} catégorie{{ filtered.length > 1 ? 's' : '' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button @click="setStatus('')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === '' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">Toutes</button>
          <button @click="setStatus('active')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'">Actives</button>
          <button @click="setStatus('inactive')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="statusFilter === 'inactive' ? 'bg-gray-500 text-white' : 'text-gray-600 hover:bg-gray-50'">Inactives</button>
        </div>
        <HubLangSelector aria-label="Langue d'affichage" />
        <input
          v-model="search"
          type="text"
          placeholder="Nom, slug, meta…"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <NuxtLink
          to="/hub/marketing/blog-categories/new"
          class="text-xs px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          + Nouvelle catégorie
        </NuxtLink>
      </div>
    </header>

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="px-6 py-4 space-y-2">
        <div v-for="i in 8" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!filtered.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucune catégorie</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium w-14">#</th>
            <th class="px-4 py-2.5 font-medium">Nom</th>
            <th class="px-4 py-2.5 font-medium">Slug</th>
            <th class="px-4 py-2.5 font-medium">Meta title</th>
            <th class="px-4 py-2.5 font-medium text-center w-20">Articles</th>
            <th class="px-4 py-2.5 font-medium text-center w-20">Enfants</th>
            <th class="px-4 py-2.5 font-medium text-center w-24">Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="cat in filtered"
            :key="cat.id"
            class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            @click="openCategory(cat.id)"
          >
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ cat.id }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100 font-medium">
              <span :style="`padding-left: ${Math.max(0, (cat.levelDepth - 2)) * 20}px`" class="inline-flex items-center gap-1">
                <svg v-if="cat.levelDepth > 2" class="w-3 h-3 text-gray-300 -mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                {{ cat.name || '— Sans nom —' }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500 font-mono">{{ cat.linkRewrite || '—' }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500 truncate max-w-xs">{{ cat.metaTitle || '—' }}</td>
            <td class="px-4 py-2.5 text-center text-xs text-gray-600 dark:text-slate-300">{{ cat.articlesCount }}</td>
            <td class="px-4 py-2.5 text-center text-xs text-gray-600 dark:text-slate-300">{{ cat.childrenCount }}</td>
            <td class="px-4 py-2.5 text-center">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="cat.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'"
              >
                {{ cat.active ? 'Active' : 'Inactive' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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

interface CategoryRow {
  id: number
  parentId: number
  levelDepth: number
  position: number
  active: 0 | 1
  name: string
  linkRewrite: string
  metaTitle: string
  metaDescription: string
  description: string
  articlesCount: number
  childrenCount: number
}

const categories = ref<CategoryRow[]>([])
const loading = ref(false)
const search = ref('')
const statusFilter = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return categories.value.filter(c => {
    if (statusFilter.value === 'active' && !c.active) return false
    if (statusFilter.value === 'inactive' && c.active) return false
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.linkRewrite.toLowerCase().includes(q) ||
      c.metaTitle.toLowerCase().includes(q)
    )
  })
})

function setStatus(s: string) { statusFilter.value = s }
function openCategory(id: number) { router.push(`/hub/marketing/blog-categories/${id}`) }

async function load() {
  loading.value = true
  try {
    const data = await $fetch<{ categories: CategoryRow[] }>('/api/bo/marketing/blog-categories', {
      query: { lang: currentLangId.value },
    })
    categories.value = data.categories ?? []
  } finally { loading.value = false }
}

onMounted(load)
watch(currentLangId, load)
</script>
