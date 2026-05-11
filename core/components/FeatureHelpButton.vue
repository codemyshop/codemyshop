
<template>
  <teleport to="body">
    
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="open = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col border border-gray-200 dark:border-slate-700">
        <header class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold">?</span>
              <h2 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">{{ playbook?.title }}</h2>
            </div>
            <p v-if="playbook?.description" class="text-xs text-gray-500 dark:text-slate-400 mt-1.5">{{ playbook.description }}</p>
            <div class="flex items-center gap-1.5 mt-2 flex-wrap">
              <span v-for="r in roles" :key="r" class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-medium">{{ r }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <NuxtLink v-if="playbook" :to="`/hub/playbooks/${playbook.slug}`" @click="open = false" class="text-[11px] px-2 py-1 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800" title="Voir le playbook complet">
              Ouvrir ↗
            </NuxtLink>
            <button @click="open = false" class="w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-slate-200">✕</button>
          </div>
        </header>

        <article class="flex-1 overflow-y-auto px-6 py-5 prose prose-sm dark:prose-invert max-w-none">
          <template v-for="(block, i) in blocks" :key="i">
            <component :is="blockComponent(block)" v-bind="blockProps(block)" />
          </template>
          <p v-if="!blocks.length" class="text-xs text-gray-400 italic text-center py-6">Ce playbook n'a pas encore de contenu.</p>
        </article>

        <footer class="px-6 py-3 border-t border-gray-100 dark:border-slate-800 text-right">
          <button @click="open = false" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold">Compris</button>
        </footer>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
const route = useRoute()
const { role, isOwner } = useRoles()
const playbook = ref<any>(null)
const open = ref(false)

const BTN_ID = 'feature-help-btn'
const BTN_CLASS = 'ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 hover:bg-primary-600 hover:text-white transition-colors dark:bg-primary-900/30 dark:text-primary-300 align-middle shrink-0'
const ICON_SVG = `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>`

const roles = computed(() => (playbook.value?.roles || '').split(',').filter(Boolean))
const blocks = computed(() => {
  try { return JSON.parse(playbook.value?.content_json || '[]') }
  catch { return [] }
})

function blockComponent(block: any) {
  switch (block.type) {
    case 'heading': return 'h' + (block.level || 2) as any
    case 'checklist': return 'ul'
    default: return 'div'
  }
}

function blockProps(block: any) {
  switch (block.type) {
    case 'heading':
      return { innerHTML: block.text || '', class: 'font-bold text-gray-800 dark:text-slate-100' }
    case 'paragraph':
      return { innerHTML: block.text || '', class: 'text-gray-700 dark:text-slate-300' }
    case 'checklist':
      return {
        innerHTML: (block.items || []).map((item: any) =>
          `<li class="flex items-start gap-2"><span class="mt-0.5 w-4 h-4 border rounded flex-shrink-0 ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}"></span><span>${escapeHtml(item.text || '')}</span></li>`
        ).join(''),
        class: 'list-none space-y-2',
      }
    case 'alert':
      return {
        innerHTML: block.text || '',
        class: `text-sm p-3 rounded-lg ${
          block.variant === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
          : block.variant === 'danger' ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
          : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
        }`,
      }
    default:
      return { innerHTML: block.text || block.content || '', class: 'text-gray-700 dark:text-slate-300' }
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function removeInjectedButton() {
  if (typeof document === 'undefined') return
  document.getElementById(BTN_ID)?.remove()
}

function injectButton() {
  if (typeof document === 'undefined' || !playbook.value) return
  removeInjectedButton()
  
  const h1 = document.querySelector('main h1, .flex-1 > header h1, header h1') as HTMLElement | null
  if (!h1) return
  const btn = document.createElement('button')
  btn.id = BTN_ID
  btn.type = 'button'
  btn.className = BTN_CLASS
  btn.title = `Aide : ${playbook.value.title}`
  btn.innerHTML = ICON_SVG
  btn.addEventListener('click', () => { open.value = true })
  
  h1.appendChild(btn)
}

async function resolvePlaybook() {
  playbook.value = null
  open.value = false
  removeInjectedButton()
  try {
    const query: Record<string, string> = { path: route.path }
    
    if (!isOwner.value && role.value) query.role = role.value
    const res = await $fetch<{ playbook: any }>('/api/bo/playbooks/by-route', { query })
    playbook.value = res.playbook || null
  } catch {
    playbook.value = null
  }
  
  await nextTick()
  setTimeout(injectButton, 50)
}

watch(() => route.path, resolvePlaybook, { immediate: true })

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') open.value = false }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  removeInjectedButton()
})
</script>
