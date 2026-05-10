<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Déclinaisons</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ filtered.length }} groupe{{ filtered.length > 1 ? 's' : '' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <HubLangSelector aria-label="Langue d'affichage" />
        <input
          v-model="search"
          type="text"
          placeholder="Nom…"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <NuxtLink
          to="/hub/variants/new"
          class="text-xs px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >+ Nouveau groupe</NuxtLink>
      </div>
    </header>

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="px-6 py-4 space-y-2">
        <div v-for="i in 6" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!filtered.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun groupe de déclinaisons</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium w-14">#</th>
            <th class="px-4 py-2.5 font-medium">Nom</th>
            <th class="px-4 py-2.5 font-medium">Public</th>
            <th class="px-4 py-2.5 font-medium text-center w-20">Type</th>
            <th class="px-4 py-2.5 font-medium text-center w-24">Attributs</th>
            <th class="px-4 py-2.5 font-medium text-center w-28">Combinaisons</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="g in filtered"
            :key="g.id"
            class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            @click="open(g.id)"
          >
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ g.id }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100 font-medium">{{ g.name }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ g.publicName || '—' }}</td>
            <td class="px-4 py-2.5 text-center">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider"
                :class="g.isColorGroup
                  ? 'bg-violet-50 text-violet-600'
                  : 'bg-gray-100 text-gray-500'"
              >{{ g.groupType }}</span>
            </td>
            <td class="px-4 py-2.5 text-center text-xs text-gray-600 dark:text-slate-300">{{ g.attributesCount }}</td>
            <td class="px-4 py-2.5 text-center text-xs text-gray-600 dark:text-slate-300">{{ g.combinationsCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('intelligence')) navigateTo('/hub/dashboard')

const router = useRouter()
const { currentLangId } = useHubLang()

interface VariantRow {
  id: number; name: string; publicName: string
  isColorGroup: 0 | 1; groupType: string; position: number
  attributesCount: number; combinationsCount: number
}

const variants = ref<VariantRow[]>([])
const loading = ref(false)
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return variants.value
  return variants.value.filter(v =>
    v.name.toLowerCase().includes(q) || v.publicName.toLowerCase().includes(q),
  )
})

function open(id: number) { router.push(`/hub/variants/${id}`) }

async function load() {
  loading.value = true
  try {
    const data = await $fetch<{ variants: VariantRow[] }>('/api/bo/pim/variants', {
      query: { lang: currentLangId.value },
    })
    variants.value = data.variants ?? []
  } finally { loading.value = false }
}

onMounted(load)
watch(currentLangId, load)
</script>
