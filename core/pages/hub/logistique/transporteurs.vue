<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Transporteurs</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ carriers.length }} transporteur{{ carriers.length > 1 ? 's' : '' }} configurés</p>
      </div>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-1.5 text-xs text-gray-500">
          <input type="checkbox" v-model="showAll" @change="load" class="rounded border-gray-300" />
          Afficher les inactifs
        </label>
        <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors">Actualiser</button>
      </div>
    </header>

    <div class="flex-1 overflow-auto p-6">
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-32 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!carriers.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Aucun transporteur</p>
      </div>

      <div v-else class="space-y-4 max-w-3xl">
        <div v-for="c in carriers" :key="c.id_carrier"
          class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5">

          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                :class="c.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H6.375m11.25-4.5V6.375a1.125 1.125 0 0 0-1.125-1.125H3.375a1.125 1.125 0 0 0-1.125 1.125v11.25M18.75 14.25h2.625c.621 0 1.125-.504 1.125-1.125V9m-4.875 0h4.875M18.75 9l2.55-3.825a.818.818 0 0 0-.132-1.05A.818.818 0 0 0 20.625 4H18" />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ c.name }}</h3>
                <p class="text-xs text-gray-400">{{ c.delay || 'Délai non renseigné' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="c.is_free" class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600">Gratuit</span>
              <span v-else class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">Payant</span>
              <button @click="toggleActive(c)" :disabled="saving === c.id_carrier"
                class="text-[11px] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                :class="c.active ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'">
                {{ c.active ? 'Actif' : 'Inactif' }}
              </button>
            </div>
          </div>

          <!-- Edit form -->
          <div v-if="editingId === c.id_carrier" class="border-t border-gray-100 dark:border-slate-700 pt-4 mt-4 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Nom</label>
                <input v-model="editForm.name" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Délai de livraison</label>
                <input v-model="editForm.delay" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" placeholder="2-3 jours ouvrés" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Poids max (kg)</label>
                <input v-model.number="editForm.maxWeight" type="number" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" />
              </div>
              <div class="flex items-end">
                <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <input type="checkbox" v-model="editForm.isFree" class="rounded border-gray-300" />
                  Livraison gratuite
                </label>
              </div>
            </div>
            <div class="flex items-center gap-2 pt-1">
              <button @click="saveEdit(c)" :disabled="saving === c.id_carrier" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-40">
                {{ saving === c.id_carrier ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
              <button @click="editingId = null" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
            </div>
          </div>

          <!-- Info + edit button -->
          <div v-else class="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3 mt-3">
            <div class="flex items-center gap-4 text-xs text-gray-500">
              <span v-if="c.zones">Zones : {{ c.zones }}</span>
              <span v-if="c.max_weight">Max {{ c.max_weight }} kg</span>
              <span v-if="c.deliveryRanges?.length">{{ c.deliveryRanges.length }} tranche{{ c.deliveryRanges.length > 1 ? 's' : '' }} de prix</span>
            </div>
            <button @click="startEdit(c)" class="text-xs text-primary-600 hover:text-primary-700 transition-colors">Modifier</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const carriers = ref<any[]>([])
const loading = ref(false)
const showAll = ref(false)
const editingId = ref<number | null>(null)
const saving = ref<number | null>(null)
const editForm = reactive({ name: '', delay: '', maxWeight: 0, isFree: false })

function startEdit(c: any) {
  editingId.value = c.id_carrier
  editForm.name = c.name
  editForm.delay = c.delay || ''
  editForm.maxWeight = c.max_weight || 0
  editForm.isFree = !!c.is_free
}

async function saveEdit(c: any) {
  saving.value = c.id_carrier
  try {
    await $fetch(`/api/bo/carriers/${c.id_carrier}`, { method: 'PUT', body: editForm })
    editingId.value = null
    await load()
  } finally { saving.value = null }
}

async function toggleActive(c: any) {
  saving.value = c.id_carrier
  try {
    await $fetch(`/api/bo/carriers/${c.id_carrier}`, { method: 'PUT', body: { active: !c.active } })
    await load()
  } finally { saving.value = null }
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/carriers', { query: { all: showAll.value ? '1' : '0' } })
    carriers.value = data.carriers ?? []
  } finally { loading.value = false }
}

onMounted(() => load())
</script>
