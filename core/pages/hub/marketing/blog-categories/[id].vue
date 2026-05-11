<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/marketing/blog-categories" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">
          {{ isNew ? 'Nouvelle catégorie' : (form.name || '— Sans nom —') }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          <span v-if="!isNew">#{{ form.id }}</span>
          <span v-if="form.linkRewrite" class="ml-2 font-mono">/{{ form.linkRewrite }}</span>
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
        <button
          v-if="!isNew"
          @click="remove"
          :disabled="saving"
          class="text-xs px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors font-medium"
        >
          Supprimer
        </button>
        <button
          @click="save"
          :disabled="saving || loading"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
        >
          {{ saving ? 'Enregistrement…' : (isNew ? 'Créer' : 'Enregistrer') }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="px-6 py-8">
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="h-48 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="h-64 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    </div>

    <form v-else-if="loaded" @submit.prevent="save" class="px-6 py-6">
      <div class="max-w-3xl mx-auto space-y-6">

        
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6" :class="!isMaster ? 'opacity-60' : ''">
          <header class="mb-4">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Structure</h2>
            <p class="text-xs text-gray-400 mt-0.5">Emplacement dans l'arborescence et visibilité publique.</p>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Parent</label>
              <select
                v-model.number="form.parentId"
                :disabled="!isMaster"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option v-for="p in parentsEligible" :key="p.id" :value="p.id">
                  {{ '— '.repeat(Math.max(0, p.levelDepth - 1)) }}{{ p.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Statut</label>
              <label class="inline-flex items-center gap-2 h-10 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.active"
                  :disabled="!isMaster"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span class="text-sm text-gray-700 dark:text-slate-200">{{ form.active ? 'Active (visible publique)' : 'Inactive (masquée)' }}</span>
              </label>
            </div>

            <div v-if="!isNew" class="md:col-span-2 text-xs text-gray-500 flex gap-6 pt-2 border-t border-gray-100 dark:border-slate-800">
              <span>{{ form.articlesCount }} article{{ form.articlesCount > 1 ? 's' : '' }} rattaché{{ form.articlesCount > 1 ? 's' : '' }}</span>
              <span>{{ form.childrenCount }} sous-catégorie{{ form.childrenCount > 1 ? 's' : '' }}</span>
              <span>Profondeur : {{ form.levelDepth }}</span>
            </div>
          </div>
        </section>

        
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-4">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Contenu</h2>
            <p class="text-xs text-gray-400 mt-0.5">Nom affiché et URL. Le slug doit être unique sous le parent.</p>
          </header>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Nom <span class="text-red-500">*</span></label>
              <input
                v-model="form.name"
                type="text"
                required
                maxlength="128"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                Slug (URL) <span class="text-red-500">*</span>
                <span class="ml-2 text-gray-400 font-mono">/blog/…/{{ form.linkRewrite || '…' }}/</span>
              </label>
              <input
                v-model="form.linkRewrite"
                type="text"
                required
                maxlength="128"
                pattern="[a-z0-9\-]+"
                placeholder="ex : strategie"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary-300"
                @blur="form.linkRewrite = slugify(form.linkRewrite)"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Description</label>
              <textarea
                v-model="form.description"
                rows="3"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
              <p class="text-xs text-gray-400 mt-1">Affichée en tête de la page catégorie, sous le label.</p>
            </div>
          </div>
        </section>

        
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-4">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">SEO</h2>
            <p class="text-xs text-gray-400 mt-0.5">Balises meta, Open Graph et Twitter Card lisent ces champs.</p>
          </header>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                Meta title
                <span class="ml-2 text-gray-400">{{ (form.metaTitle || '').length }}/255</span>
              </label>
              <input
                v-model="form.metaTitle"
                type="text"
                maxlength="255"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                Meta description
                <span class="ml-2 text-gray-400">{{ (form.metaDescription || '').length }}/512</span>
              </label>
              <textarea
                v-model="form.metaDescription"
                rows="3"
                maxlength="512"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>

          </div>
        </section>

      </div>
    </form>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('intelligence')) {
  navigateTo('/hub/dashboard')
}

const route = useRoute()
const router = useRouter()
const { currentLangId } = useHubLang()

const isNew = computed(() => route.params.id === 'new')
const isMaster = computed(() => currentLangId.value === 1)

interface CategoryForm {
  id: number
  parentId: number
  levelDepth: number
  position: number
  active: boolean
  name: string
  linkRewrite: string
  description: string
  metaTitle: string
  metaDescription: string
  articlesCount: number
  childrenCount: number
}

interface ParentOption {
  id: number
  name: string
  levelDepth: number
}

const form = reactive<CategoryForm>({
  id: 0, parentId: 0, levelDepth: 0, position: 0, active: true,
  name: '', linkRewrite: '', description: '',
  metaTitle: '', metaDescription: '',
  articlesCount: 0, childrenCount: 0,
})

const parentsEligible = ref<ParentOption[]>([])
const loading = ref(false)
const loaded = ref(false)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)

async function load() {
  loading.value = true
  saveError.value = null
  try {
    const data = await $fetch<any>(`/api/bo/marketing/blog-categories/${route.params.id}`, {
      query: { lang: currentLangId.value },
    })
    Object.assign(form, {
      id: data.category.id,
      parentId: data.category.parentId,
      levelDepth: data.category.levelDepth,
      position: data.category.position,
      active: !!data.category.active,
      name: data.category.name,
      linkRewrite: data.category.linkRewrite,
      description: data.category.description,
      metaTitle: data.category.metaTitle,
      metaDescription: data.category.metaDescription,
      articlesCount: data.category.articlesCount,
      childrenCount: data.category.childrenCount,
    })
    parentsEligible.value = data.parentsEligible ?? []
    loaded.value = true
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  saveError.value = null
  saved.value = false
  try {
    const payload: Record<string, any> = {
      name: form.name,
      linkRewrite: form.linkRewrite,
      description: form.description,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
    }
    if (isMaster.value) {
      payload.parentId = form.parentId
      payload.active = form.active
    }
    const target = isNew.value ? 'new' : form.id
    const res = await $fetch<any>(`/api/bo/marketing/blog-categories/${target}`, {
      method: 'PUT',
      query: { lang: currentLangId.value },
      body: payload,
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
    if (res?.created && res?.id) {
      router.replace(`/hub/marketing/blog-categories/${res.id}`)
    } else {
      await load()
    }
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Erreur de sauvegarde'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm(`Supprimer la catégorie "${form.name}" ?`)) return
  saving.value = true
  saveError.value = null
  try {
    await $fetch(`/api/bo/marketing/blog-categories/${form.id}`, { method: 'DELETE' })
    router.push('/hub/marketing/blog-categories')
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Erreur de suppression'
    saving.value = false
  }
}

function slugify(input: string): string {
  return String(input || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128)
}

watch(() => form.name, (n) => {
  if (isNew.value && isMaster.value && !form.linkRewrite) {
    form.linkRewrite = slugify(n)
  }
})

onMounted(load)
watch(currentLangId, load)
</script>
