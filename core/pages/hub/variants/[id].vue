<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/variants" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">
          {{ isNew ? 'Nouveau groupe' : (form.name || '— Sans nom —') }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          <span v-if="!isNew">#{{ form.id }}</span>
          <span v-if="form.groupType" class="ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider bg-gray-100 dark:bg-slate-800 text-gray-500">{{ form.groupType }}</span>
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
            <p class="text-xs text-gray-400 mt-0.5">Nom interne (BO), nom public (boutique), type d'affichage.</p>
          </header>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Nom <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" required maxlength="128"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Nom public</label>
              <input v-model="form.publicName" type="text" maxlength="64"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Type</label>
              <select v-model="form.groupType" :disabled="!isMaster"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300">
                <option value="select">Liste déroulante</option>
                <option value="color">Pastille couleur</option>
                <option value="radio">Boutons radio</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Affichage couleur</label>
              <label class="inline-flex items-center gap-2 h-10 cursor-pointer">
                <input type="checkbox" v-model="form.isColorGroup" :disabled="!isMaster"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span class="text-sm text-gray-700 dark:text-slate-200">{{ form.isColorGroup ? 'Pastilles couleur' : 'Texte simple' }}</span>
              </label>
            </div>
            <div v-if="!isNew" class="md:col-span-2 text-xs text-gray-500 flex gap-6 pt-2 border-t border-gray-100 dark:border-slate-800">
              <span>{{ form.attributesCount }} attribut{{ form.attributesCount > 1 ? 's' : '' }}</span>
              <span>{{ form.combinationsCount }} combinaison{{ form.combinationsCount > 1 ? 's' : '' }} produit</span>
            </div>
          </div>
        </section>

        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Attributs</h2>
              <p class="text-xs text-gray-400 mt-0.5">Valeurs sélectionnables (ex: Rouge, Vert, Bleu pour Couleur).</p>
            </div>
            <button type="button" @click="addAttribute" class="text-xs px-3 py-1.5 border border-primary-200 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-medium">+ Attribut</button>
          </header>

          <div v-if="!attributes.length" class="text-center py-6 text-xs text-gray-400">Aucun attribut — ajoute-en pour les rendre disponibles sur les produits.</div>

          <ul v-else class="space-y-2">
            <li v-for="(a, i) in attributes" :key="a.id || `new-${i}`" class="flex items-center gap-2">
              <span class="text-xs text-gray-400 font-mono w-12">{{ a.id ? `#${a.id}` : 'nouv.' }}</span>
              <input v-model="a.name" type="text" maxlength="128" placeholder="Nom"
                class="flex-1 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <input v-if="form.isColorGroup" v-model="a.color" type="color" class="h-8 w-10 rounded border border-gray-200 dark:border-slate-700 cursor-pointer" />
              <input v-model.number="a.position" type="number" min="0" placeholder="pos"
                class="w-16 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <button type="button" @click="removeAttribute(i)" :disabled="!isMaster" class="text-xs text-red-500 hover:text-red-700 disabled:opacity-30 px-2">×</button>
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

interface VariantForm {
  id: number; position: number
  isColorGroup: boolean; groupType: string
  name: string; publicName: string
  attributesCount: number; combinationsCount: number
}
interface AttrRow { id: number; name: string; color: string; position: number }

const form = reactive<VariantForm>({
  id: 0, position: 0, isColorGroup: false, groupType: 'select',
  name: '', publicName: '', attributesCount: 0, combinationsCount: 0,
})
const attributes = ref<AttrRow[]>([])
const loading = ref(false)
const loaded = ref(false)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)

async function load() {
  loading.value = true
  saveError.value = null
  try {
    const data = await $fetch<any>(`/api/bo/pim/variants/${route.params.id}`, {
      query: { lang: currentLangId.value },
    })
    Object.assign(form, {
      id: data.variant.id, position: data.variant.position,
      isColorGroup: !!data.variant.isColorGroup,
      groupType: data.variant.groupType || 'select',
      name: data.variant.name, publicName: data.variant.publicName,
      attributesCount: data.variant.attributesCount,
      combinationsCount: data.variant.combinationsCount,
    })
    attributes.value = (data.attributes ?? []).map((a: any, i: number) => ({
      id: a.id, name: a.name, color: a.color || '#000000', position: a.position ?? i,
    }))
    loaded.value = true
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Erreur de chargement'
  } finally { loading.value = false }
}

function addAttribute() {
  attributes.value.push({ id: 0, name: '', color: '#000000', position: attributes.value.length })
}
function removeAttribute(i: number) { attributes.value.splice(i, 1) }

async function save() {
  saving.value = true
  saveError.value = null
  saved.value = false
  try {
    const payload: Record<string, any> = {
      name: form.name,
      publicName: form.publicName,
      attributes: attributes.value.filter(a => a.name.trim()),
    }
    if (isMaster.value) {
      payload.position = form.position
      payload.isColorGroup = form.isColorGroup
      payload.groupType = form.groupType
    }
    const target = isNew.value ? 'new' : form.id
    const res = await $fetch<any>(`/api/bo/pim/variants/${target}`, {
      method: 'PUT', query: { lang: currentLangId.value }, body: payload,
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
    if (res?.created && res?.id) router.replace(`/hub/variants/${res.id}`)
    else await load()
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Erreur de sauvegarde'
  } finally { saving.value = false }
}

async function remove() {
  if (!confirm(`Supprimer le groupe "${form.name}" ?`)) return
  saving.value = true
  saveError.value = null
  try {
    await $fetch(`/api/bo/pim/variants/${form.id}`, { method: 'DELETE' })
    router.push('/hub/variants')
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Erreur de suppression'
    saving.value = false
  }
}

onMounted(load)
watch(currentLangId, load)
</script>
