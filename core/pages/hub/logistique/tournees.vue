<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">Tournées de livraison</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ tours.length }} tournée{{ tours.length > 1 ? 's' : '' }} · {{ dateLabel }}</p>
      </div>
      <div class="flex gap-2 items-center">
        <input v-model="filterDate" type="date" class="text-xs px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg" @change="load" />
        <button @click="openCreate" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold">+ Nouvelle tournée</button>
        <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">↻</button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">

      <!-- Left column: routes list -->
      <aside class="w-[380px] shrink-0 border-r border-gray-100 dark:border-slate-800 overflow-y-auto">
        <div v-if="loading" class="p-6">
          <div class="h-20 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse mb-2" />
          <div class="h-20 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div v-else-if="!tours.length" class="p-10 text-center text-xs text-gray-400">
          Aucune tournée pour {{ dateLabel }}.
          <p class="mt-2 text-[11px]">Crée-en une pour commencer.</p>
        </div>
        <ul v-else class="divide-y divide-gray-100 dark:divide-slate-800">
          <li v-for="t in tours" :key="t.id"
            @click="selectTour(t.id)"
            class="px-4 py-3 cursor-pointer hover:bg-primary-50/30 dark:hover:bg-slate-800/50"
            :class="selectedId === t.id ? 'bg-primary-50 dark:bg-slate-800/70 border-l-4 border-primary-600' : ''">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">{{ t.label }}</p>
                <p class="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                  🚚 {{ t.vehicleLabel || '—' }} · 👤 {{ t.driverName || '—' }}
                </p>
              </div>
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" :class="statusClass(t.status)">
                {{ statusLabel(t.status) }}
              </span>
            </div>
            <div class="flex items-center gap-3 mt-2 text-[11px] text-gray-600 dark:text-slate-400">
              <span class="font-mono">📍 {{ t.stopCount }} arrêts</span>
              <span class="font-mono">⚖️ {{ Number(t.totalWeight).toFixed(0) }} kg</span>
              <span class="font-mono">📦 {{ t.totalPallets }} plt</span>
              <span v-if="Number(t.totalKm) > 0" class="font-mono text-primary-600">{{ Number(t.totalKm).toFixed(1) }} km</span>
            </div>
          </li>
        </ul>
      </aside>

      <!-- Right column: detail + stops -->
      <main class="flex-1 overflow-y-auto">
        <div v-if="!selected" class="h-full flex items-center justify-center text-xs text-gray-400">
          <div class="text-center">
            <p class="text-2xl mb-2">🗺️</p>
            <p>Sélectionne une tournée à gauche pour voir ses arrêts.</p>
          </div>
        </div>

        <div v-else class="p-6 space-y-4">
          <!-- Detail header -->
          <section class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ selected.tour.label }}</h2>
                <p class="text-[11px] text-gray-500 mt-0.5">
                  🚚 {{ selected.tour.vehicleLabel || '—' }} ({{ selected.tour.vehiclePlate || '—' }})
                  · 👤 {{ selected.tour.driverName || '—' }}{{ selected.tour.driverPhone ? ' · ' + selected.tour.driverPhone : '' }}
                </p>
              </div>
              <div class="flex gap-2">
                <button @click="optimizeTour" :disabled="optimizing" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50">
                  {{ optimizing ? 'Optimisation…' : '🧭 Optimiser (TSP)' }}
                </button>
                <select v-model="selected.tour.status" @change="updateStatus" class="text-xs px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                  <option value="planned">Planifiée</option>
                  <option value="in_progress">En cours</option>
                  <option value="done">Terminée</option>
                  <option value="cancelled">Annulée</option>
                </select>
                <button @click="deleteTour" class="text-xs px-2 py-1.5 border border-danger-200 text-danger-600 rounded-lg hover:bg-danger-50" title="Supprimer">✕</button>
              </div>
            </div>
            <div class="grid grid-cols-4 gap-3 text-xs">
              <div class="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-2">
                <p class="text-[10px] uppercase tracking-wider text-gray-400">Arrêts</p>
                <p class="font-bold text-gray-800 dark:text-slate-100 mt-0.5">{{ selected.stops.length }}</p>
              </div>
              <div class="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-2">
                <p class="text-[10px] uppercase tracking-wider text-gray-400">Charge</p>
                <p class="font-bold text-gray-800 dark:text-slate-100 mt-0.5">
                  {{ totalWeight }}<span class="text-[10px] text-gray-400 font-normal"> / {{ Number(selected.tour.vehicleCapacityKg || 0).toFixed(0) }} kg</span>
                </p>
              </div>
              <div class="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-2">
                <p class="text-[10px] uppercase tracking-wider text-gray-400">Palettes</p>
                <p class="font-bold text-gray-800 dark:text-slate-100 mt-0.5">
                  {{ totalPallets }}<span class="text-[10px] text-gray-400 font-normal"> / {{ selected.tour.vehicleCapacityPallets || 0 }}</span>
                </p>
              </div>
              <div class="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-2">
                <p class="text-[10px] uppercase tracking-wider text-gray-400">Distance</p>
                <p class="font-bold text-primary-600 mt-0.5">
                  {{ Number(selected.tour.totalKm || 0).toFixed(1) }}<span class="text-[10px] text-gray-400 font-normal"> km</span>
                </p>
              </div>
            </div>
            <p v-if="selected.tour.optimizedAt" class="text-[10px] text-gray-400 mt-2">
              Dernière optimisation : {{ new Date(selected.tour.optimizedAt).toLocaleString('fr-FR') }}
            </p>
          </section>

          <!-- Liste stops -->
          <section>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500">📍 Feuille de route</h3>
              <button @click="openAddStop" class="text-[11px] px-2 py-1 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">+ Ajouter un arrêt</button>
            </div>
            <div v-if="!selected.stops.length" class="py-8 text-center text-xs text-gray-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
              Aucun arrêt dans cette tournée.
            </div>
            <ol v-else class="space-y-1.5">
              <li v-for="(s, idx) in selected.stops" :key="s.id"
                class="bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 p-3 flex items-start gap-3">
                <div class="shrink-0 w-7 h-7 rounded-full bg-primary-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {{ s.position || idx + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">{{ s.customerLabel }}</p>
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" :class="stopStatusClass(s.status)">
                      {{ stopStatusLabel(s.status) }}
                    </span>
                  </div>
                  <p class="text-[11px] text-gray-500 mt-0.5 truncate">
                    {{ s.address }}{{ s.address ? ', ' : '' }}{{ s.postcode }} {{ s.city }}
                  </p>
                  <div class="flex items-center gap-3 mt-1 text-[11px] text-gray-600 dark:text-slate-400">
                    <span v-if="s.windowStart || s.windowEnd" class="font-mono">🕐 {{ s.windowStart || '—' }} / {{ s.windowEnd || '—' }}</span>
                    <span v-if="Number(s.weightKg) > 0" class="font-mono">⚖️ {{ Number(s.weightKg).toFixed(0) }} kg</span>
                    <span v-if="Number(s.pallets) > 0" class="font-mono">📦 {{ s.pallets }} plt</span>
                    <span v-if="Number(s.lat) === 0 && Number(s.lng) === 0" class="text-amber-600">⚠︎ sans GPS</span>
                  </div>
                </div>
                <div class="shrink-0 flex flex-col gap-1">
                  <button @click="markStop(s, 'delivered')" class="text-[10px] px-2 py-0.5 border border-success-200 text-success-700 rounded hover:bg-success-50">✓ Livré</button>
                  <button @click="markStop(s, 'failed')" class="text-[10px] px-2 py-0.5 border border-danger-200 text-danger-600 rounded hover:bg-danger-50">✕ Échec</button>
                  <button @click="deleteStop(s)" class="text-[10px] px-2 py-0.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">🗑</button>
                </div>
              </li>
            </ol>
          </section>
        </div>
      </main>
    </div>

    <!-- Modal create route -->
    <div v-if="createOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="createOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md mx-4">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Nouvelle tournée</h2>
          <button @click="createOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitCreate" class="p-5 space-y-3">
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Libellé *</span>
            <input v-model="form.label" required maxlength="128" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="Tournée Paris Est — Restaurants" />
          </label>
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Date *</span>
            <input v-model="form.tourDate" type="date" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Véhicule</span>
              <select v-model.number="form.idVehicle" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5">
                <option :value="0">—</option>
                <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.label }} ({{ v.plate }})</option>
              </select>
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Chauffeur</span>
              <select v-model.number="form.idDriver" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5">
                <option :value="0">—</option>
                <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.fullName }}</option>
              </select>
            </label>
          </div>
          <p v-if="createError" class="text-xs text-danger-500">{{ createError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="createOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" :disabled="saving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">{{ saving ? 'Création…' : 'Créer' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal ajout stop -->
    <div v-if="stopOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="stopOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-lg mx-4">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Ajouter un arrêt</h2>
          <button @click="stopOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submitStop" class="p-5 space-y-3">
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">Client *</span>
            <input v-model="stopForm.customerLabel" required maxlength="255" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Adresse</span>
              <input v-model="stopForm.address" maxlength="255" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Ville</span>
              <input v-model="stopForm.city" maxlength="128" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">CP</span>
              <input v-model="stopForm.postcode" maxlength="16" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Lat / Lng</span>
              <div class="flex gap-1">
                <input v-model.number="stopForm.lat" type="number" step="0.000001" class="w-1/2 mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="lat" />
                <input v-model.number="stopForm.lng" type="number" step="0.000001" class="w-1/2 mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" placeholder="lng" />
              </div>
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Fenêtre début</span>
              <input v-model="stopForm.windowStart" type="time" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Fenêtre fin</span>
              <input v-model="stopForm.windowEnd" type="time" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Poids (kg)</span>
              <input v-model.number="stopForm.weightKg" type="number" step="0.1" min="0" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">Palettes</span>
              <input v-model.number="stopForm.pallets" type="number" min="0" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
          </div>
          <p v-if="stopError" class="text-xs text-danger-500">{{ stopError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="stopOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">Annuler</button>
            <button type="submit" :disabled="stopSaving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">{{ stopSaving ? 'Ajout…' : 'Ajouter' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface Tour {
  id: number; label: string; tourDate: string
  idVehicle: number; vehicleLabel: string | null; vehiclePlate: string | null
  vehicleCapacityKg?: number; vehicleCapacityPallets?: number
  idDriver: number; driverName: string | null; driverPhone?: string | null
  depotLat: number; depotLng: number
  status: string; optimizedAt: string | null; totalKm: number
  stopCount: number; totalWeight: number; totalPallets: number
}
interface Stop {
  id: number; position: number; idOrder: number; idCustomer: number
  customerLabel: string; address: string; postcode: string; city: string
  lat: number; lng: number
  windowStart: string | null; windowEnd: string | null
  weightKg: number; pallets: number; status: string; notes: string | null
}

const today = () => new Date().toISOString().slice(0, 10)
const filterDate = ref(today())
const tours = ref<Tour[]>([])
const loading = ref(true)
const selectedId = ref<number | null>(null)
const selected = ref<{ tour: Tour; stops: Stop[] } | null>(null)
const vehicles = ref<any[]>([])
const drivers = ref<any[]>([])

const createOpen = ref(false)
const saving = ref(false)
const createError = ref('')
const form = ref({ label: '', tourDate: today(), idVehicle: 0, idDriver: 0 })

const stopOpen = ref(false)
const stopSaving = ref(false)
const stopError = ref('')
const stopForm = ref({
  customerLabel: '', address: '', city: '', postcode: '',
  lat: 0, lng: 0, windowStart: '', windowEnd: '', weightKg: 0, pallets: 0,
})

const optimizing = ref(false)

const dateLabel = computed(() => {
  try { return new Date(filterDate.value).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) }
  catch { return filterDate.value }
})
const totalWeight = computed(() => selected.value?.stops.reduce((acc, s) => acc + Number(s.weightKg || 0), 0).toFixed(0) || '0')
const totalPallets = computed(() => selected.value?.stops.reduce((acc, s) => acc + Number(s.pallets || 0), 0) || 0)

function statusClass(s: string): string {
  if (s === 'in_progress') return 'bg-primary-100 text-primary-700'
  if (s === 'done')        return 'bg-success-100 text-success-700'
  if (s === 'cancelled')   return 'bg-gray-200 text-gray-500'
  return 'bg-amber-100 text-amber-700'
}
function statusLabel(s: string): string {
  if (s === 'in_progress') return 'En cours'
  if (s === 'done')        return 'Terminée'
  if (s === 'cancelled')   return 'Annulée'
  return 'Planifiée'
}
function stopStatusClass(s: string): string {
  if (s === 'delivered') return 'bg-success-100 text-success-700'
  if (s === 'failed')    return 'bg-danger-100 text-danger-600'
  if (s === 'skipped')   return 'bg-gray-200 text-gray-500'
  return 'bg-amber-100 text-amber-700'
}
function stopStatusLabel(s: string): string {
  if (s === 'delivered') return 'Livré'
  if (s === 'failed')    return 'Échec'
  if (s === 'skipped')   return 'Ignoré'
  return 'En attente'
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; tours: Tour[] }>('/api/bo/routing/tours', { query: { date: filterDate.value } })
    tours.value = res.tours || []
    if (selectedId.value && !tours.value.find(t => t.id === selectedId.value)) {
      selectedId.value = null
      selected.value = null
    } else if (selectedId.value) {
      await reloadSelected()
    }
  } catch (e) { console.error('routing/tours load failed', e) }
  finally { loading.value = false }
}

async function loadRefData() {
  try {
    const [v, d] = await Promise.all([
      $fetch<{ ok: boolean; vehicles: any[] }>('/api/bo/routing/vehicles'),
      $fetch<{ ok: boolean; drivers: any[] }>('/api/bo/routing/drivers'),
    ])
    vehicles.value = v.vehicles || []
    drivers.value = d.drivers || []
  } catch (e) { console.error('routing ref load failed', e) }
}

async function selectTour(id: number) {
  selectedId.value = id
  await reloadSelected()
}
async function reloadSelected() {
  if (!selectedId.value) return
  try {
    const res = await $fetch<{ ok: boolean; tour: Tour; stops: Stop[] }>(`/api/bo/routing/tours/${selectedId.value}`)
    selected.value = { tour: res.tour, stops: res.stops || [] }
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

function openCreate() {
  createError.value = ''
  form.value = { label: '', tourDate: filterDate.value || today(), idVehicle: 0, idDriver: 0 }
  createOpen.value = true
}
async function submitCreate() {
  saving.value = true
  createError.value = ''
  try {
    await $fetch('/api/bo/routing/tours', { method: 'POST', body: form.value })
    createOpen.value = false
    await load()
  } catch (e: any) {
    createError.value = e?.data?.statusMessage || e?.message || 'Erreur'
  } finally { saving.value = false }
}

async function updateStatus() {
  if (!selected.value) return
  try {
    await $fetch(`/api/bo/routing/tours/${selected.value.tour.id}`, { method: 'PUT', body: { status: selected.value.tour.status } })
    await load()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

async function deleteTour() {
  if (!selected.value) return
  if (!confirm(`Supprimer "${selected.value.tour.label}" ?`)) return
  try {
    await $fetch(`/api/bo/routing/tours/${selected.value.tour.id}`, { method: 'DELETE' })
    selectedId.value = null
    selected.value = null
    await load()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

async function optimizeTour() {
  if (!selected.value) return
  optimizing.value = true
  try {
    const res = await $fetch<{ ok: boolean; stopsOrdered: number; stopsWithoutGps: number; totalKm: number }>(
      `/api/bo/routing/tours/${selected.value.tour.id}/optimize`,
      { method: 'POST' },
    )
    await reloadSelected()
    await load()
    if (res.stopsWithoutGps > 0) {
      alert(`Optimisé : ${res.stopsOrdered} arrêts GPS (${res.totalKm} km). ${res.stopsWithoutGps} arrêts sans coordonnées placés en fin.`)
    }
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  } finally { optimizing.value = false }
}

function openAddStop() {
  stopError.value = ''
  stopForm.value = { customerLabel: '', address: '', city: '', postcode: '', lat: 0, lng: 0, windowStart: '', windowEnd: '', weightKg: 0, pallets: 0 }
  stopOpen.value = true
}
async function submitStop() {
  if (!selected.value) return
  stopSaving.value = true
  stopError.value = ''
  try {
    await $fetch(`/api/bo/routing/tours/${selected.value.tour.id}/stops`, { method: 'POST', body: stopForm.value })
    stopOpen.value = false
    await reloadSelected()
    await load()
  } catch (e: any) {
    stopError.value = e?.data?.statusMessage || e?.message || 'Erreur'
  } finally { stopSaving.value = false }
}

async function markStop(s: Stop, status: string) {
  try {
    await $fetch(`/api/bo/routing/stops/${s.id}`, { method: 'PUT', body: { status } })
    await reloadSelected()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}
async function deleteStop(s: Stop) {
  if (!confirm(`Supprimer "${s.customerLabel}" ?`)) return
  try {
    await $fetch(`/api/bo/routing/stops/${s.id}`, { method: 'DELETE' })
    await reloadSelected()
    await load()
  } catch (e: any) {
    alert(`Erreur : ${e?.data?.statusMessage || e?.message}`)
  }
}

onMounted(async () => {
  await loadRefData()
  await load()
})
</script>
