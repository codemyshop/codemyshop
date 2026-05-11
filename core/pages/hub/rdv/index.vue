
<script setup lang="ts">
definePageMeta({ layout: 'hub' })

interface Slot {
  id_availability: number
  date_start: string
  duration_min: number
  is_booked: number
  notes: string | null
}
interface Appointment {
  id_appointment: number
  id_availability: number
  id_ac_smartlead: number | null
  prospect_name: string
  prospect_email: string
  prospect_phone: string | null
  prospect_message: string | null
  date_appointment: string
  duration_min: number
  status: string
  date_add: string
}

const { data, pending, refresh } = await useFetch<{ success: boolean; slots: Slot[]; appointments: Appointment[] }>(
  '/api/bo/appointment',
  { default: () => ({ success: true, slots: [], appointments: [] }) },
)

type Tab = 'requests' | 'slots' | 'config'
const tab = ref<Tab>('requests')

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}

const newSlot = reactive({ dateStart: '', durationMin: 30, notes: '' })
const creating = ref(false)
const errorMsg = ref('')

async function onCreateSlot() {
  if (creating.value) return
  if (!newSlot.dateStart) { errorMsg.value = 'Date/heure requis'; return }
  creating.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/bo/appointment/availability', {
      method: 'POST',
      body: {
        dateStart: new Date(newSlot.dateStart).toISOString(),
        durationMin: newSlot.durationMin,
        notes: newSlot.notes,
      },
    })
    newSlot.dateStart = ''
    newSlot.notes = ''
    await refresh()
  }
  catch (err: any) {
    errorMsg.value = err?.statusMessage || err?.data?.statusMessage || 'Création impossible'
  }
  finally { creating.value = false }
}

const todayStr = new Date().toISOString().slice(0, 10)
const oneYearLater = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
const bulk = reactive({
  dateFrom: todayStr,
  dateTo: oneYearLater,
  hourStart: 6,
  hourEnd: 13,
  slotMinutes: 30,
  daysOfWeek: [1, 2, 3, 4, 5] as number[],
  excludeFrenchHolidays: true,
})
const bulkLoading = ref(false)
const bulkResult = ref<{ inserted: number } | null>(null)
const bulkError = ref('')

function toggleDow(d: number) {
  const idx = bulk.daysOfWeek.indexOf(d)
  if (idx >= 0) bulk.daysOfWeek.splice(idx, 1)
  else bulk.daysOfWeek.push(d)
  bulk.daysOfWeek.sort()
}

async function onBulk() {
  if (bulkLoading.value) return
  bulkLoading.value = true
  bulkError.value = ''
  bulkResult.value = null
  try {
    const r = await $fetch<{ success: boolean; inserted: number }>(
      '/api/bo/appointment/availability/bulk',
      { method: 'POST', body: { ...bulk } },
    )
    bulkResult.value = { inserted: r.inserted }
    await refresh()
  }
  catch (err: any) {
    bulkError.value = err?.statusMessage || err?.data?.statusMessage || 'Génération impossible'
  }
  finally { bulkLoading.value = false }
}

const openSlots = computed(() => (data.value?.slots ?? []).filter(s => s.is_booked === 0))
const slotsPageSize = 30
const slotsPage = ref(1)
const slotsTotalPages = computed(() => Math.max(1, Math.ceil(openSlots.value.length / slotsPageSize)))
const slotsPageRows = computed(() => {
  const start = (slotsPage.value - 1) * slotsPageSize
  return openSlots.value.slice(start, start + slotsPageSize)
})
watch(openSlots, () => {
  
  
  if (slotsPage.value > slotsTotalPages.value) slotsPage.value = slotsTotalPages.value
})

async function onDeleteSlot(id: number) {
  if (!confirm('Supprimer ce créneau ?')) return
  try {
    await $fetch(`/api/bo/appointment/availability/${id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (err: any) {
    alert(err?.statusMessage || err?.data?.statusMessage || 'Suppression impossible')
  }
}

async function onChangeStatus(id: number, status: string) {
  try {
    await $fetch(`/api/bo/appointment/${id}`, { method: 'PATCH', body: { status } })
    await refresh()
  }
  catch (err: any) {
    alert(err?.statusMessage || err?.data?.statusMessage || 'Maj impossible')
  }
}

const dowLabels: Array<{ iso: number; short: string }> = [
  { iso: 1, short: 'L' }, { iso: 2, short: 'M' }, { iso: 3, short: 'M' },
  { iso: 4, short: 'J' }, { iso: 5, short: 'V' }, { iso: 6, short: 'S' }, { iso: 7, short: 'D' },
]
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 shrink-0">
      <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Rendez-vous</h1>
      <p class="text-xs text-gray-400 mt-0.5">Page publique : <NuxtLink to="/rdv" target="_blank" class="text-primary-600 hover:underline">/rdv</NuxtLink></p>

      
      <nav class="flex items-center gap-1 mt-4 -mb-2">
        <button
          v-for="t in (['requests','slots','config'] as const)"
          :key="t"
          type="button"
          :class="[
            'px-3 py-1.5 rounded-t-lg text-xs font-semibold border-b-2 transition-colors',
            tab === t
              ? 'border-primary-600 text-primary-700 dark:text-primary-300'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white',
          ]"
          @click="tab = t"
        >
          {{ t === 'requests' ? `Demandes (${data?.appointments?.length ?? 0})`
            : t === 'slots' ? `Créneaux (${openSlots.length})`
            : 'Configuration' }}
        </button>
      </nav>
    </header>

    <div class="flex-1 overflow-auto px-6 py-6 space-y-6">

      
      <section v-if="tab === 'requests'">
        <div v-if="!data?.appointments?.length" class="text-xs text-gray-500 dark:text-slate-400">
          Aucune demande de RDV pour le moment.
        </div>
        <div v-else class="overflow-x-auto bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl">
          <table class="w-full text-sm">
            <thead class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th class="text-left px-3 py-2">Date</th>
                <th class="text-left px-3 py-2">Prospect</th>
                <th class="text-left px-3 py-2">Email</th>
                <th class="text-left px-3 py-2">Tél</th>
                <th class="text-left px-3 py-2">Lead/Projet</th>
                <th class="text-left px-3 py-2">Statut</th>
                <th class="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in data.appointments"
                :key="a.id_appointment"
                class="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <td class="px-3 py-2 text-gray-900 dark:text-slate-100">
                  {{ fmtDateTime(a.date_appointment) }}
                  <br>
                  <span class="text-xs text-gray-500 dark:text-slate-400">{{ a.duration_min }} min</span>
                </td>
                <td class="px-3 py-2 text-gray-900 dark:text-slate-100">{{ a.prospect_name }}</td>
                <td class="px-3 py-2"><a :href="`mailto:${a.prospect_email}`" class="text-primary-600 hover:underline">{{ a.prospect_email }}</a></td>
                <td class="px-3 py-2 text-gray-600 dark:text-slate-300">{{ a.prospect_phone || '—' }}</td>
                <td class="px-3 py-2 text-xs">
                  <NuxtLink
                    v-if="a.id_ac_smartlead"
                    :to="`/hub/contacts/${a.id_ac_smartlead}`"
                    class="text-primary-600 hover:underline"
                  >Lead #{{ a.id_ac_smartlead }}</NuxtLink>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="px-3 py-2">
                  <span
                    class="text-xs font-semibold px-2 py-0.5 rounded-full"
                    :class="{
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300': a.status === 'pending',
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300': a.status === 'confirmed',
                      'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300': a.status === 'done',
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300': a.status === 'cancelled',
                    }"
                  >{{ a.status }}</span>
                </td>
                <td class="px-3 py-2 space-x-1 text-xs whitespace-nowrap">
                  <button v-if="a.status !== 'confirmed'" type="button" class="text-emerald-600 hover:underline" @click="onChangeStatus(a.id_appointment, 'confirmed')">Confirmer</button>
                  <button v-if="a.status !== 'done'" type="button" class="text-gray-600 hover:underline" @click="onChangeStatus(a.id_appointment, 'done')">Fait</button>
                  <button v-if="a.status !== 'cancelled'" type="button" class="text-red-600 hover:underline" @click="onChangeStatus(a.id_appointment, 'cancelled')">Annuler</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      
      <section v-else-if="tab === 'slots'">
        <div v-if="pending" class="text-xs text-gray-500 dark:text-slate-400">Chargement…</div>
        <div v-else-if="!openSlots.length" class="text-xs text-gray-500 dark:text-slate-400">Aucun créneau ouvert. Onglet « Configuration » pour générer.</div>
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div
              v-for="s in slotsPageRows"
              :key="s.id_availability"
              class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between"
            >
              <div>
                <div class="text-sm font-semibold text-gray-900 dark:text-slate-100">{{ fmtDateTime(s.date_start) }}</div>
                <div class="text-xs text-gray-500 dark:text-slate-400">{{ s.duration_min }} min{{ s.notes ? ` — ${s.notes}` : '' }}</div>
              </div>
              <button type="button" class="text-xs text-red-600 hover:text-red-700 hover:underline" @click="onDeleteSlot(s.id_availability)">
                Retirer
              </button>
            </div>
          </div>

          
          <div class="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <div>
              {{ (slotsPage - 1) * slotsPageSize + 1 }}–{{ Math.min(slotsPage * slotsPageSize, openSlots.length) }}
              sur {{ openSlots.length }}
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                :disabled="slotsPage <= 1"
                class="px-2 py-1 rounded border border-gray-200 dark:border-slate-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800"
                @click="slotsPage = 1"
              >«</button>
              <button
                type="button"
                :disabled="slotsPage <= 1"
                class="px-2 py-1 rounded border border-gray-200 dark:border-slate-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800"
                @click="slotsPage--"
              >‹</button>
              <span class="px-2 py-1">Page {{ slotsPage }} / {{ slotsTotalPages }}</span>
              <button
                type="button"
                :disabled="slotsPage >= slotsTotalPages"
                class="px-2 py-1 rounded border border-gray-200 dark:border-slate-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800"
                @click="slotsPage++"
              >›</button>
              <button
                type="button"
                :disabled="slotsPage >= slotsTotalPages"
                class="px-2 py-1 rounded border border-gray-200 dark:border-slate-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800"
                @click="slotsPage = slotsTotalPages"
              >»</button>
            </div>
          </div>
        </template>
      </section>

      
      <section v-else class="space-y-6">

        
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">Ouverture en lot</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mb-4">
            Génère tous les créneaux d'une période, par tranches horaires. Les créneaux déjà existants sont ignorés (NOT EXISTS sur date_start).
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Du</label>
              <input v-model="bulk.dateFrom" type="date" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Au</label>
              <input v-model="bulk.dateTo" type="date" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Heure début</label>
              <input v-model.number="bulk.hourStart" type="number" min="0" max="23" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Heure fin</label>
              <input v-model.number="bulk.hourEnd" type="number" min="1" max="24" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Durée slot (min)</label>
              <input v-model.number="bulk.slotMinutes" type="number" min="5" max="240" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="sm:col-span-4">
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Jours ouvrés</label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="d in dowLabels"
                  :key="d.iso"
                  type="button"
                  :class="[
                    'w-8 h-8 rounded-full text-xs font-bold transition-colors',
                    bulk.daysOfWeek.includes(d.iso)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700',
                  ]"
                  @click="toggleDow(d.iso)"
                >{{ d.short }}</button>
              </div>
            </div>
            <div class="sm:col-span-6">
              <label class="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-slate-200 cursor-pointer">
                <input v-model="bulk.excludeFrenchHolidays" type="checkbox" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                Exclure les jours fériés français (1ᵉʳ janv., Pâques, 1/8 mai, Ascension, Pentecôte, 14 juill., 15 août, 1/11 nov., 25 déc.)
              </label>
            </div>
            <div class="sm:col-span-6 flex items-center gap-3">
              <button
                type="button"
                :disabled="bulkLoading || !bulk.daysOfWeek.length"
                class="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
                @click="onBulk"
              >
                {{ bulkLoading ? '…' : 'Générer les créneaux' }}
              </button>
              <span v-if="bulkResult" class="text-xs text-emerald-600 dark:text-emerald-400">
                ✓ {{ bulkResult.inserted }} créneau{{ bulkResult.inserted > 1 ? 'x' : '' }} créé{{ bulkResult.inserted > 1 ? 's' : '' }}
              </span>
              <span v-else-if="bulkError" class="text-xs text-red-600 dark:text-red-400">{{ bulkError }}</span>
            </div>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">Ouvrir un créneau ponctuel</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mb-4">Pour ajouter un seul horaire hors planning récurrent.</p>
          <form class="grid grid-cols-1 sm:grid-cols-4 gap-3" @submit.prevent="onCreateSlot">
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Date &amp; heure</label>
              <input v-model="newSlot.dateStart" type="datetime-local" required class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Durée (min)</label>
              <input v-model.number="newSlot.durationMin" type="number" min="5" max="240" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="flex items-end">
              <button type="submit" :disabled="creating" class="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors">
                {{ creating ? '…' : 'Ouvrir' }}
              </button>
            </div>
            <div class="sm:col-span-4">
              <label class="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Notes interne (optionnel)</label>
              <input v-model="newSlot.notes" type="text" maxlength="255" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div v-if="errorMsg" class="sm:col-span-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-2 text-xs text-red-700 dark:text-red-300">
              {{ errorMsg }}
            </div>
          </form>
        </div>
      </section>

    </div>
  </div>
</template>
