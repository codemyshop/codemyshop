
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">

    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">Fournisseurs</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
            Annuaire ps_supplier · coordonnées, produits rattachés, historique achats
          </p>
        </div>
        <div class="flex items-center gap-2">
          <a
            href="/api/bo/procurement/suppliers/export"
            download
            class="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
            title="Télécharger l'annuaire (CSV)"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Exporter
          </a>
          <button
            @click="importOpen = true"
            class="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
            title="Importer des fournisseurs depuis un CSV"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
            Importer
          </button>
          <button @click="openCreate"
            class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Nouveau fournisseur
          </button>
        </div>
      </div>
    </header>

    <HubImportModal
      :open="importOpen"
      title="Importer des fournisseurs"
      subtitle="CSV — UPSERT par nom. Met à jour ps_supplier + ps_supplier_lang + ps_address. Les produits rattachés et bons de commande sont préservés."
      endpoint="/api/bo/procurement/suppliers/import"
      :target-fields="importTargetFields"
      :field-aliases="importFieldAliases"
      :matching-keys="['name']"
      create-missing-label="Créer les fournisseurs manquants"
      create-missing-hint="Insère un fournisseur si le nom n'existe pas encore. Crée la fiche ps_supplier + ps_supplier_lang + ps_address."
      @close="importOpen = false"
      @done="load"
    />

    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total</p>
          <p class="text-2xl font-extrabold">{{ data?.total ?? 0 }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Actifs</p>
          <p class="text-2xl font-extrabold text-success-600">{{ data?.activeCount ?? 0 }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Produits référencés</p>
          <p class="text-2xl font-extrabold">{{ totalProducts }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">BC historiques</p>
          <p class="text-2xl font-extrabold">{{ totalOrders }}</p>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold">Annuaire</h2>
          <input v-model="search" @input="loadDebounced" type="text" placeholder="Rechercher nom, ville, téléphone…"
            class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-72 bg-white dark:bg-slate-900" />
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">Nom</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">Contact</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">Ville</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-500">État</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">Produits</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">BC</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-if="loading" v-for="i in 4" :key="`sk-${i}`"><td colspan="7" class="px-4 py-3"><div class="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /></td></tr>
              <tr v-else-if="!data?.suppliers.length"><td colspan="7" class="px-4 py-10 text-center text-gray-400">Aucun fournisseur. Créez-en un via le bouton ci-dessus.</td></tr>
              <tr v-for="s in data?.suppliers" :key="s.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer" @click="navigateTo(`/hub/procurement/suppliers/${s.id}`)">
                <td class="px-4 py-2.5 font-semibold">{{ s.name }}</td>
                <td class="px-4 py-2.5 text-gray-600 dark:text-slate-400 font-mono text-[11px]">{{ s.phone || s.phoneMobile || '—' }}</td>
                <td class="px-4 py-2.5 text-gray-600 dark:text-slate-400">{{ s.city || '—' }}</td>
                <td class="px-4 py-2.5">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" :class="s.active ? 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-500'">
                    <span class="w-1 h-1 rounded-full" :class="s.active ? 'bg-success-500' : 'bg-gray-400'" />
                    {{ s.active ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-right font-bold tabular-nums">{{ s.productCount }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-slate-400">{{ s.orderCount }}</td>
                <td class="px-4 py-2.5 text-right">
                  <button @click.stop="openEdit(s)" class="text-[11px] font-semibold text-primary-600 hover:text-primary-700">Éditer</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    
    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" @click.self="closeModal">
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h3 class="text-sm font-bold">{{ editId ? `Éditer « ${form.name} »` : 'Nouveau fournisseur' }}</h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div class="px-6 py-5 space-y-4">
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Nom *</label>
            <input v-model="form.name" type="text" maxlength="64" placeholder="Nom du fournisseur"
              class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea v-model="form.description" rows="2" placeholder="Description libre, conditions commerciales…"
              class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Téléphone</label>
              <input v-model="form.phone" type="tel" maxlength="32" placeholder="+33 1 23 45 67 89"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 font-mono" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Mobile</label>
              <input v-model="form.phoneMobile" type="tel" maxlength="32" placeholder="+33 6 12 34 56 78"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 font-mono" />
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Adresse</label>
            <input v-model="form.address1" type="text" maxlength="128" placeholder="Rue et numéro"
              class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">CP</label>
              <input v-model="form.postcode" type="text" maxlength="12"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
            </div>
            <div class="col-span-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Ville</label>
              <input v-model="form.city" type="text" maxlength="64"
                class="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900" />
            </div>
          </div>
          <label class="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
            <input v-model="form.active" type="checkbox" class="rounded" />
            <span>Fournisseur actif</span>
          </label>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 flex items-center justify-between">
          <p v-if="formError" class="text-xs text-danger-600">{{ formError }}</p>
          <p v-else class="text-xs text-gray-400">Les champs marqués * sont obligatoires.</p>
          <div class="flex items-center gap-2">
            <button v-if="editId" @click="deleteSupplier" :disabled="saving"
              class="text-xs font-semibold text-danger-600 hover:text-danger-700 disabled:opacity-40 px-3 py-1.5">Supprimer</button>
            <button @click="closeModal" class="text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-800 px-3 py-1.5">Annuler</button>
            <button @click="saveSupplier" :disabled="!form.name || saving"
              class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white">
              {{ saving ? '…' : (editId ? 'Enregistrer' : 'Créer') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

interface Supplier {
  id: number; name: string; active: boolean
  productCount: number; orderCount: number
  dateAdd: string
  phone: string; phoneMobile: string
  address1: string; postcode: string; city: string
}

const data = ref<{ total: number; activeCount: number; suppliers: Supplier[] } | null>(null)
const loading = ref(true)
const search = ref('')

const importOpen = ref(false)
const importTargetFields = [
  { key: 'name', label: 'Nom', required: true },
  { key: 'active', label: 'Actif' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'phoneMobile', label: 'Mobile' },
  { key: 'address1', label: 'Adresse' },
  { key: 'postcode', label: 'CP' },
  { key: 'city', label: 'Ville' },
  { key: 'description', label: 'Description' },
]
const importFieldAliases: Record<string, string[]> = {
  name: ['nom', 'name', 'fournisseur', 'supplier'],
  active: ['actif', 'active', 'status', 'statut', 'etat', 'état'],
  phone: ['telephone', 'téléphone', 'phone', 'tel', 'fixe'],
  phoneMobile: ['mobile', 'portable', 'gsm', 'phone_mobile'],
  address1: ['adresse', 'address', 'address1', 'rue'],
  postcode: ['cp', 'code postal', 'postcode', 'zip'],
  city: ['ville', 'city'],
  description: ['description', 'notes', 'commentaire', 'remarque'],
}

const totalProducts = computed(() => data.value?.suppliers.reduce((s, x) => s + x.productCount, 0) ?? 0)
const totalOrders = computed(() => data.value?.suppliers.reduce((s, x) => s + x.orderCount, 0) ?? 0)

async function load() {
  loading.value = true
  try {
    data.value = await $fetch('/api/bo/procurement/suppliers', { query: search.value ? { search: search.value } : {} })
  } catch { data.value = null }
  finally { loading.value = false }
}

let debounceTimer: any = null
function loadDebounced() { clearTimeout(debounceTimer); debounceTimer = setTimeout(load, 250) }

const modalOpen = ref(false)
const editId = ref<number | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({
  name: '', description: '',
  phone: '', phoneMobile: '',
  address1: '', postcode: '', city: '',
  active: true,
})

function resetForm() {
  form.name = ''; form.description = ''
  form.phone = ''; form.phoneMobile = ''
  form.address1 = ''; form.postcode = ''; form.city = ''
  form.active = true
  formError.value = ''
}

function openCreate() {
  editId.value = null
  resetForm()
  modalOpen.value = true
}

async function openEdit(s: Supplier) {
  editId.value = s.id
  resetForm()
  
  Object.assign(form, {
    name: s.name, phone: s.phone, phoneMobile: s.phoneMobile,
    address1: s.address1, postcode: s.postcode, city: s.city,
    active: s.active,
  })
  
  try {
    const detail = await $fetch<any>(`/api/bo/procurement/suppliers/${s.id}`)
    form.description = detail?.supplier?.description || ''
  } catch {  }
  modalOpen.value = true
}

function closeModal() { modalOpen.value = false }

async function saveSupplier() {
  if (!form.name.trim()) { formError.value = 'Nom obligatoire'; return }
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description,
      phone: form.phone, phoneMobile: form.phoneMobile,
      address1: form.address1, postcode: form.postcode, city: form.city,
      active: form.active ? 1 : 0,
    }
    if (editId.value) {
      await $fetch(`/api/bo/procurement/suppliers/${editId.value}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/bo/procurement/suppliers', { method: 'POST', body: payload })
    }
    closeModal()
    load()
  } catch (e: any) {
    formError.value = e?.statusMessage || 'Erreur'
  } finally { saving.value = false }
}

async function deleteSupplier() {
  if (!editId.value) return
  if (!confirm(`Supprimer « ${form.name} » ? Le fournisseur sera désactivé et archivé.`)) return
  saving.value = true
  try {
    await $fetch(`/api/bo/procurement/suppliers/${editId.value}`, { method: 'DELETE' })
    closeModal()
    load()
  } catch (e: any) {
    formError.value = e?.statusMessage || 'Erreur'
  } finally { saving.value = false }
}

onMounted(load)
</script>
