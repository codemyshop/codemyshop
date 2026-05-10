<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/features" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">
          {{ isNew ? 'Nouvelle caractéristique' : (form.name || '— Sans nom —') }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          <span v-if="!isNew">#{{ form.id }}</span>
          <span v-if="!isMaster" class="ml-2 inline-flex items-center gap-1 text-amber-600">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
            Traduction — structure verrouillée
          </span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <HubLangSelector aria-label="Langue d'édition" />
        <span v-if="saved" class="text-xs text-green-600 font-medium">Sauvegardé</span>
        <span v-if="saveError" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="saveError">{{ saveError }}</span>
        <button v-if="!isNew" @click="remove" :disabled="saving" class="text-xs px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors font-medium">Supprimer</button>
        <button @click="save" :disabled="saving || loading" class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium">
          {{ saving ? 'Enregistrement…' : (isNew ? 'Créer' : 'Enregistrer') }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="px-6 py-8">
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="h-32 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="h-64 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    </div>

    <form v-else-if="loaded" @submit.prevent="save" class="px-6 py-6">
      <div class="max-w-3xl mx-auto space-y-6">

        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-4">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Identité</h2>
            <p class="text-xs text-gray-400 mt-0.5">Nom de la caractéristique (ex: Composition, Origine, Certification).</p>
          </header>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Nom <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" required maxlength="128"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Position</label>
              <input v-model.number="form.position" type="number" min="0" :disabled="!isMaster"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <div v-if="!isNew" class="md:col-span-3 text-xs text-gray-500 flex gap-6 pt-2 border-t border-gray-100 dark:border-slate-800">
              <span>{{ form.valuesCount }} valeur{{ form.valuesCount > 1 ? 's' : '' }}</span>
              <span>{{ form.productsCount }} produit{{ form.productsCount > 1 ? 's' : '' }} utilisateur{{ form.productsCount > 1 ? 's' : '' }}</span>
            </div>
          </div>
        </section>

        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Valeurs prédéfinies</h2>
              <p class="text-xs text-gray-400 mt-0.5">Liste des valeurs assignables aux produits (ex: Coton, Laine, Lin).</p>
            </div>
            <button type="button" @click="addValue" class="text-xs px-3 py-1.5 border border-primary-200 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-medium">+ Valeur</button>
          </header>

          <div v-if="!values.length" class="text-center py-6 text-xs text-gray-400">Aucune valeur — ajoute-en pour les rendre sélectionnables sur les produits.</div>

          <ul v-else class="space-y-2">
            <li v-for="(v, i) in values" :key="v.id || `new-${i}`" class="flex items-center gap-2">
              <span class="text-xs text-gray-400 font-mono w-12">{{ v.id ? `#${v.id}` : 'nouv.' }}</span>
              <input v-model="v.value" type="text" maxlength="255"
                class="flex-1 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <button type="button" @click="removeValue(i)" :disabled="!isMaster" class="text-xs text-red-500 hover:text-red-700 disabled:opacity-30 px-2">×</button>
            </li>
          </ul>
        </section>

      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('intelligence')) navigateTo('/hub/dashboard')

const route = useRoute()
const router = useRouter()
const { currentLangId } = useHubLang()

const isNew = computed(() => route.params.id === 'new')
const isMaster = computed(() => currentLangId.value === 1)

interface FeatureForm {
  id: number; position: number; name: string
  valuesCount: number; productsCount: number
}
interface ValueRow { id: number; value: string }

const form = reactive<FeatureForm>({ id: 0, position: 0, name: '', valuesCount: 0, productsCount: 0 })
const values = ref<ValueRow[]>([])
const loading = ref(false)
const loaded = ref(false)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)

async function load() {
  loading.value = true
  saveError.value = null
  try {
    const data = await $fetch<any>(`/api/bo/pim/features/${route.params.id}`, {
      query: { lang: currentLangId.value },
    })
    Object.assign(form, {
      id: data.feature.id, position: data.feature.position,
      name: data.feature.name,
      valuesCount: data.feature.valuesCount, productsCount: data.feature.productsCount,
    })
    values.value = (data.values ?? []).map((v: any) => ({ id: v.id, value: v.value }))
    loaded.value = true
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Erreur de chargement'
  } finally { loading.value = false }
}

function addValue() { values.value.push({ id: 0, value: '' }) }
function removeValue(i: number) { values.value.splice(i, 1) }

async function save() {
  saving.value = true
  saveError.value = null
  saved.value = false
  try {
    const payload: Record<string, any> = {
      name: form.name,
      values: values.value.filter(v => v.value.trim()),
    }
    if (isMaster.value) payload.position = form.position
    const target = isNew.value ? 'new' : form.id
    const res = await $fetch<any>(`/api/bo/pim/features/${target}`, {
      method: 'PUT', query: { lang: currentLangId.value }, body: payload,
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
    if (res?.created && res?.id) router.replace(`/hub/features/${res.id}`)
    else await load()
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Erreur de sauvegarde'
  } finally { saving.value = false }
}

async function remove() {
  if (!confirm(`Supprimer la caractéristique "${form.name}" ?`)) return
  saving.value = true
  saveError.value = null
  try {
    await $fetch(`/api/bo/pim/features/${form.id}`, { method: 'DELETE' })
    router.push('/hub/features')
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Erreur de suppression'
    saving.value = false
  }
}

onMounted(load)
watch(currentLangId, load)
</script>
