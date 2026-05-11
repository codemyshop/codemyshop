<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/team" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">
          {{ isNew ? 'Nouveau collaborateur' : `${form.firstname} ${form.lastname}`.trim() || 'Collaborateur' }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          <span v-if="!isNew">#{{ form.id }} — </span>
          {{ form.email || 'pas encore d\'email' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="saved" class="text-xs text-green-600 font-medium">Sauvegardé</span>
        <span v-if="saveError" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="saveError">{{ saveError }}</span>
        <button
          v-if="!isNew"
          @click="confirmDelete"
          :disabled="deleting || saving"
          class="text-xs px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors font-medium"
        >
          {{ deleting ? 'Suppression…' : 'Supprimer' }}
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
      <div class="max-w-2xl mx-auto space-y-6">
        <div class="h-72 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    </div>

    <div v-else-if="loaded" class="px-6 py-6">
      <div class="max-w-2xl mx-auto space-y-6">
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Identité</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              Le profil pilote les permissions Hub et l'accès PrestaShop natif.
            </p>
          </header>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Prénom</label>
                <input
                  v-model="form.firstname"
                  type="text"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Nom</label>
                <input
                  v-model="form.lastname"
                  type="text"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Email</label>
              <input
                v-model="form.email"
                type="email"
                autocomplete="off"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
              <p class="text-[10px] text-gray-400 mt-1">Sert aussi d'identifiant de connexion au Hub.</p>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                Mot de passe
                <span v-if="!isNew" class="text-[10px] text-gray-400 font-normal">(laisser vide pour ne pas changer)</span>
              </label>
              <input
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                :placeholder="isNew ? 'Minimum 8 caractères' : '••••••••'"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Profil</label>
                <select
                  v-model.number="form.profileId"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                >
                  <option :value="0" disabled>— Choisir un profil —</option>
                  <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
                <p v-if="!viewerIsSaas" class="text-[10px] text-gray-400 mt-1">
                  Profil "SuperAdmin PrestaShop" masqué — réservé à l'équipe CodeMyShop.
                </p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Statut</label>
                <div class="flex items-center gap-2 h-[38px]">
                  <button
                    type="button"
                    @click="form.active = !form.active"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    :class="form.active ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      :class="form.active ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>
                  <span class="text-xs text-gray-600 dark:text-slate-300">
                    {{ form.active ? 'Actif' : 'Inactif' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        
        <section v-if="!isNew" class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Page auteur</h2>
              <p class="text-xs text-gray-400 mt-0.5">
                Profil public utilisé pour les articles de blog (E-E-A-T).
                <NuxtLink v-if="extra.slug" :to="`/auteur/${extra.slug}`" target="_blank" class="text-primary-600 hover:underline">
                  Voir la page →
                </NuxtLink>
              </p>
            </div>
            <button
              type="button"
              @click="extra.active = extra.active ? 0 : 1"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              :class="extra.active ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'"
              :title="extra.active ? 'Page auteur active' : 'Page auteur masquée'"
            >
              <span
                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                :class="extra.active ? 'translate-x-5' : 'translate-x-1'"
              />
            </button>
          </header>

          <p v-if="extraTableMissing" class="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg mb-4">
            Module <code>ac_employee_extra</code> non installé sur ce tenant — la page auteur ne sera pas persistée tant que l'install n'est pas faite.
          </p>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Slug public</label>
                <input
                  v-model="extra.slug"
                  type="text"
                  :placeholder="`${form.firstname}-${form.lastname}`.toLowerCase()"
                  class="w-full text-sm font-mono border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
                <p class="text-[10px] text-gray-400 mt-1">URL : /auteur/{slug}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Nom d'affichage</label>
                <input
                  v-model="extra.display_name"
                  type="text"
                  :placeholder="`${form.firstname} ${form.lastname}`.trim()"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Expertise (1 ligne)</label>
              <input
                v-model="extra.expertise"
                type="text"
                placeholder="Architecte e-commerce — PrestaShop, Nuxt, IA"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Bio</label>
              <textarea
                v-model="extra.bio"
                rows="4"
                placeholder="Présentation publique. Markdown autorisé."
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none resize-y"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Photo</label>
                <div class="flex items-center gap-3">
                  <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img
                      v-if="extra.photo_url"
                      :src="extra.photo_url"
                      :alt="extra.display_name || form.firstname"
                      class="w-full h-full object-cover"
                    />
                    <svg v-else class="w-7 h-7 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        @click="photoInput?.click()"
                        :disabled="photoUploading || !form.id"
                        class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors font-medium"
                      >
                        {{ photoUploading ? 'Conversion…' : (extra.photo_url ? 'Remplacer' : 'Téléverser') }}
                      </button>
                      <button
                        v-if="extra.photo_url && !photoUploading"
                        type="button"
                        @click="removePhoto"
                        class="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Retirer
                      </button>
                    </div>
                    <p v-if="photoError" class="text-[10px] text-red-600">{{ photoError }}</p>
                    <p v-else-if="photoInfo" class="text-[10px] text-emerald-600">{{ photoInfo }}</p>
                    <p v-else class="text-[10px] text-gray-400">JPG/PNG → AVIF ou WebP automatique (max 8 Mo)</p>
                  </div>
                  <input
                    ref="photoInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="onPhotoFile"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">URL LinkedIn</label>
                <input
                  v-model="extra.linkedin_url"
                  type="text"
                  placeholder="https://linkedin.com/in/…"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-else class="px-6 py-16 text-center">
      <p class="text-sm text-gray-500">Collaborateur introuvable.</p>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('founder_admin')) {
  navigateTo('/hub/dashboard')
}

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const loaded = ref(false)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)
const isNew = ref(false)
const deleting = ref(false)
const viewerIsSaas = ref(false)
const profiles = ref<Array<{ id: number; name: string }>>([])
const extraTableMissing = ref(false)

const form = reactive({
  id: 0,
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  profileId: 0,
  active: true,
})

const extra = reactive({
  slug: '',
  display_name: '',
  bio: '',
  expertise: '',
  photo_url: '',
  linkedin_url: '',
  active: 1 as 0 | 1,
})

const photoInput = ref<HTMLInputElement | null>(null)
const photoUploading = ref(false)
const photoError = ref<string | null>(null)
const photoInfo = ref<string | null>(null)

async function onPhotoFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !form.id) return

  if (!file.type.startsWith('image/')) {
    photoError.value = 'Format non supporté'
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    photoError.value = 'Fichier trop volumineux (max 8 Mo)'
    return
  }

  photoError.value = null
  photoInfo.value = null
  photoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<any>(`/api/bo/team/extra/${form.id}/upload-photo`, {
      method: 'POST',
      body: fd,
    })
    extra.photo_url = res.url
    photoInfo.value = `${(res.format || '').toUpperCase()} · ${res.sizeKb} Ko`
    setTimeout(() => { photoInfo.value = null }, 4000)
  } catch (err: any) {
    photoError.value = err?.data?.message || err?.message || 'Échec de l\'upload'
  } finally {
    photoUploading.value = false
  }
}

async function removePhoto() {
  if (!form.id) return
  if (!window.confirm('Retirer la photo ?')) return
  extra.photo_url = ''
  await saveExtra()
}

async function loadProfiles() {
  try {
    const data = await $fetch<any>('/api/bo/team/profiles')
    profiles.value = data.profiles ?? []
    viewerIsSaas.value = !!data.viewerIsSaas
  } catch (err) {
    console.error('Load profiles error:', err)
  }
}

async function load() {
  loading.value = true
  loaded.value = false
  try {
    const data = await $fetch<any>(`/api/bo/team/${route.params.id}`)
    const e = data.employee
    isNew.value = !!data.isNew
    form.id = Number(e.id) || 0
    form.firstname = e.firstname || ''
    form.lastname = e.lastname || ''
    form.email = e.email || ''
    form.password = ''
    form.profileId = Number(e.profileId) || 0
    form.active = isNew.value ? true : !!Number(e.active)
    viewerIsSaas.value = !!data.viewerIsSaas
    loaded.value = true

    if (!isNew.value && form.id) await loadExtra()
  } catch (err) {
    console.error('Load employee error:', err)
    loaded.value = false
  } finally {
    loading.value = false
  }
}

async function loadExtra() {
  try {
    const data = await $fetch<any>(`/api/bo/team/extra/${form.id}`)
    extraTableMissing.value = !!data.tableMissing
    const x = data.extra || {}
    extra.slug         = x.slug || ''
    extra.display_name = x.display_name || ''
    extra.bio          = x.bio || ''
    extra.expertise    = x.expertise || ''
    extra.photo_url    = x.photo_url || ''
    extra.linkedin_url = x.linkedin_url || ''
    extra.active       = Number(x.active) ? 1 : 0
  } catch (err) {
    console.warn('Load extra error:', err)
  }
}

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = null
  try {
    const payload: Record<string, any> = {
      firstname: form.firstname,
      lastname: form.lastname,
      email: form.email,
      profileId: form.profileId,
      active: form.active,
    }
    if (form.password) payload.password = form.password

    const res = await $fetch<any>(`/api/bo/team/${route.params.id}`, {
      method: 'PUT',
      body: payload,
    })

    saved.value = true
    form.password = ''
    setTimeout(() => { saved.value = false }, 3000)

    if (res?.created && res?.id) {
      router.replace(`/hub/team/${res.id}`)
    } else if (form.id) {
      
      await saveExtra()
    }
  } catch (err: any) {
    console.error('Save employee error:', err)
    saveError.value = err?.data?.message || err?.message || 'Échec de la sauvegarde'
    setTimeout(() => { saveError.value = null }, 6000)
  } finally {
    saving.value = false
  }
}

async function saveExtra() {
  if (extraTableMissing.value) return
  try {
    await $fetch(`/api/bo/team/extra/${form.id}`, {
      method: 'PUT',
      body: {
        slug: extra.slug,
        display_name: extra.display_name,
        bio: extra.bio,
        expertise: extra.expertise,
        photo_url: extra.photo_url,
        linkedin_url: extra.linkedin_url,
        active: extra.active,
      },
    })
    await loadExtra()
  } catch (err: any) {
    saveError.value = err?.data?.message || 'Échec sauvegarde page auteur'
    setTimeout(() => { saveError.value = null }, 6000)
  }
}

async function confirmDelete() {
  if (!form.id) return
  const ok = window.confirm(
    `Supprimer définitivement ${form.firstname} ${form.lastname} (#${form.id}) ?\n\n`
    + 'Si l\'employé a des commandes liées, il sera désactivé (soft delete) au lieu d\'être supprimé.'
  )
  if (!ok) return

  deleting.value = true
  try {
    const res = await $fetch<any>(`/api/bo/team/${form.id}`, { method: 'DELETE' })
    alert(res?.message || 'Suppression effectuée.')
    router.replace('/hub/team')
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Échec suppression'
    setTimeout(() => { saveError.value = null }, 6000)
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await Promise.all([load(), loadProfiles()])
})
</script>
