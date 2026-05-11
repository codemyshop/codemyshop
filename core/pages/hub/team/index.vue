<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Équipe</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ total }} collaborateur{{ total > 1 ? 's' : '' }}
          <span v-if="viewerIsSaas" class="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold tracking-wide">
            SuperAdmin PaaS — vue intégrale
          </span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="search"
          type="text"
          placeholder="Nom, email…"
          class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <NuxtLink
          to="/hub/team/profiles"
          class="text-xs px-4 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
        >
          Permissions par profil
        </NuxtLink>
        <NuxtLink
          to="/hub/team/new"
          class="text-xs px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          + Nouveau collaborateur
        </NuxtLink>
      </div>
    </header>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" label="collaborateurs"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    <div class="flex-1 overflow-auto">
      <div v-if="loading && !employees.length" class="px-6 py-4 space-y-2">
        <div v-for="i in 6" :key="i" class="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!employees.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun collaborateur</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium">#</th>
            <th class="px-4 py-2.5 font-medium">Prénom</th>
            <th class="px-4 py-2.5 font-medium">Nom</th>
            <th class="px-4 py-2.5 font-medium">Email</th>
            <th class="px-4 py-2.5 font-medium">Profil</th>
            <th class="px-4 py-2.5 font-medium text-center">Actif</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="e in employees"
            :key="e.id"
            class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            @click="openEmployee(e.id)"
          >
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ e.id }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">{{ e.firstname }}</td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">{{ e.lastname }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ e.email }}</td>
            <td class="px-4 py-2.5">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="e.profileId === 1
                  ? 'bg-red-50 text-red-600'
                  : 'bg-primary-50 text-primary-700'"
              >
                {{ e.profileName || `Profil #${e.profileId}` }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-center" @click.stop>
              
              <button
                type="button"
                :disabled="togglingId === e.id"
                @click="toggleActive(e)"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40"
                :class="e.active ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                  :class="e.active ? 'translate-x-5' : 'translate-x-1'"
                />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" label="collaborateurs" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('founder_admin')) {
  navigateTo('/hub/dashboard')
}

const router = useRouter()

const employees = ref<any[]>([])
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
const viewerIsSaas = ref(false)
const togglingId = ref<number | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

function openEmployee(id: number) {
  router.push(`/hub/team/${id}`)
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/team', {
      query: { page: page.value, perPage: perPage.value, search: search.value },
    })
    employees.value = data.employees ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
    viewerIsSaas.value = !!data.viewerIsSaas
  } finally { loading.value = false }
}

async function toggleActive(e: any) {
  togglingId.value = e.id
  const previous = e.active
  
  e.active = e.active ? 0 : 1
  try {
    await $fetch(`/api/bo/team/${e.id}`, {
      method: 'PUT',
      body: { active: !!e.active },
    })
  } catch (err) {
    console.error('Toggle active error:', err)
    e.active = previous
  } finally {
    togglingId.value = null
  }
}

onMounted(load)
</script>
