<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <NuxtLink to="/hub/playbooks" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </NuxtLink>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ editId ? 'Modifier le playbook' : 'Nouveau playbook' }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <button @click="save('draft')" :disabled="saving" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors">
          Brouillon
        </button>
        <button @click="save('published')" :disabled="saving" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          {{ saving ? 'Enregistrement…' : 'Publier' }}
        </button>
      </div>
    </header>

    <div class="flex-1 overflow-auto p-6">
      <div class="max-w-3xl mx-auto space-y-6">

        
        <div class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Titre</label>
            <input v-model="form.title" @blur="autoSlug" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" placeholder="Ex: Processus de vente B2B" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Slug</label>
            <input v-model="form.slug" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 font-mono text-xs dark:bg-slate-900 dark:text-slate-100" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea v-model="form.description" rows="2" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" placeholder="Résumé court du playbook" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Rôles ciblés</label>
            <div class="flex flex-wrap gap-2 mt-1">
              <button v-for="r in ALL_ROLES" :key="r" @click="toggleRole(r)"
                class="text-xs px-3 py-1 rounded-full border transition-colors"
                :class="form.roles.includes(r) ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-500 hover:border-primary-300'">
                {{ r }}
              </button>
            </div>
          </div>
        </div>

        
        <div class="space-y-3">
          <div v-for="(block, i) in form.blocks" :key="i"
            class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-4">
            <div class="flex items-center justify-between mb-2">
              <select v-model="block.type" class="text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 dark:bg-slate-900 dark:text-slate-100">
                <option value="heading">Titre</option>
                <option value="paragraph">Paragraphe</option>
                <option value="checklist">Checklist</option>
                <option value="alert">Alerte</option>
              </select>
              <div class="flex items-center gap-1">
                <button v-if="i > 0" @click="moveBlock(i, -1)" class="p-1 text-gray-400 hover:text-gray-600"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg></button>
                <button v-if="i < form.blocks.length - 1" @click="moveBlock(i, 1)" class="p-1 text-gray-400 hover:text-gray-600"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></button>
                <button @click="removeBlock(i)" class="p-1 text-red-400 hover:text-red-600"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
              </div>
            </div>

            
            <div v-if="block.type === 'heading'" class="flex gap-2">
              <select v-model.number="block.level" class="text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 w-16 dark:bg-slate-900 dark:text-slate-100">
                <option :value="2">H2</option>
                <option :value="3">H3</option>
                <option :value="4">H4</option>
              </select>
              <input v-model="block.text" class="flex-1 text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" placeholder="Titre de section" />
            </div>

            
            <textarea v-if="block.type === 'paragraph'" v-model="block.text" rows="3" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" placeholder="Texte libre…" />

            
            <div v-if="block.type === 'checklist'" class="space-y-2">
              <div v-for="(item, j) in block.items" :key="j" class="flex items-center gap-2">
                <input type="checkbox" v-model="item.checked" class="rounded border-gray-300" />
                <input v-model="item.text" class="flex-1 text-sm border border-gray-200 dark:border-slate-700 rounded px-2 py-1 dark:bg-slate-900 dark:text-slate-100" placeholder="Étape…" />
                <button @click="block.items.splice(j, 1)" class="text-red-400 hover:text-red-600 text-xs">x</button>
              </div>
              <button @click="block.items.push({ text: '', checked: false })" class="text-xs text-primary-600 hover:text-primary-700">+ Ajouter une étape</button>
            </div>

            
            <div v-if="block.type === 'alert'" class="space-y-2">
              <select v-model="block.variant" class="text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 dark:bg-slate-900 dark:text-slate-100">
                <option value="info">Info</option>
                <option value="warning">Attention</option>
                <option value="danger">Danger</option>
              </select>
              <textarea v-model="block.text" rows="2" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" placeholder="Message d'alerte…" />
            </div>
          </div>

          
          <div class="flex justify-center">
            <button @click="addBlock" class="text-xs px-4 py-2 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors">
              + Ajouter un bloc
            </button>
          </div>
        </div>

        <p v-if="error" class="text-xs text-red-500 text-center">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { isOwner } = useRoles()
const route = useRoute()
const router = useRouter()

if (!isOwner.value) navigateTo('/hub/playbooks')

const ALL_ROLES = ['SALES', 'SUPPORT', 'LOGISTIC', 'CATALOG', 'MARKET', 'EMPLOYEE']

const editId = ref<number | null>(null)
const saving = ref(false)
const error = ref('')

const form = reactive({
  title: '',
  slug: '',
  description: '',
  roles: [] as string[],
  blocks: [{ type: 'heading', level: 2, text: '' }] as any[],
})

function autoSlug() {
  if (!form.slug && form.title) {
    form.slug = form.title.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }
}

function toggleRole(r: string) {
  const idx = form.roles.indexOf(r)
  if (idx >= 0) form.roles.splice(idx, 1)
  else form.roles.push(r)
}

function addBlock() {
  form.blocks.push({ type: 'paragraph', text: '' })
}

function removeBlock(i: number) {
  form.blocks.splice(i, 1)
}

function moveBlock(i: number, dir: number) {
  const target = i + dir
  const temp = form.blocks[i]
  form.blocks[i] = form.blocks[target]
  form.blocks[target] = temp
}

async function save(status: 'draft' | 'published') {
  if (!form.title.trim()) { error.value = 'Titre requis'; return }
  autoSlug()
  saving.value = true
  error.value = ''
  try {
    const body: any = {
      title: form.title,
      slug: form.slug,
      description: form.description,
      content_json: JSON.stringify(form.blocks),
      status,
      roles: form.roles,
    }
    if (editId.value) body.id = editId.value
    const data = await $fetch<any>('/api/bo/playbooks/save', { method: 'POST', body })
    router.push(`/hub/playbooks/${data.slug}`)
  } catch (err: any) {
    error.value = err?.data?.message || 'Erreur de sauvegarde'
  } finally { saving.value = false }
}

onMounted(async () => {
  const editSlug = route.query.edit as string
  if (editSlug) {
    try {
      const data = await $fetch<any>(`/api/bo/playbooks/${editSlug}`)
      const p = data.playbook
      editId.value = p.id_ac_playbook
      form.title = p.title
      form.slug = p.slug
      form.description = p.description || ''
      form.roles = (p.roles || '').split(',').filter(Boolean)
      try { form.blocks = JSON.parse(p.content_json || '[]') }
      catch { form.blocks = [] }
    } catch {  }
  }
})
</script>
