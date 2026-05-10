<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <NuxtLink to="/hub/playbooks" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </NuxtLink>
        <div>
          <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ playbook?.title || 'Chargement…' }}</h1>
          <div v-if="playbook" class="flex items-center gap-2 mt-0.5">
            <span v-for="r in roles" :key="r" class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary-50 text-primary-600">{{ r }}</span>
            <span class="text-[10px] text-gray-400">{{ formatDate(playbook.date_upd) }}</span>
          </div>
        </div>
      </div>
      <NuxtLink v-if="isOwner && playbook" :to="`/hub/playbooks/create?edit=${playbook.slug}`"
        class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
        Modifier
      </NuxtLink>
    </header>

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="px-6 py-8 space-y-4">
        <div v-for="i in 5" :key="i" class="h-6 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" :style="{ width: `${60 + Math.random() * 30}%` }" />
      </div>

      <div v-else-if="!playbook" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">Playbook introuvable</p>
      </div>

      <article v-else class="max-w-3xl mx-auto px-6 py-8">
        <p v-if="playbook.description" class="text-sm text-gray-500 dark:text-slate-400 mb-6 italic">{{ playbook.description }}</p>

        <div class="prose prose-sm dark:prose-invert max-w-none">
          <template v-for="(block, i) in blocks" :key="i">
            <component :is="blockComponent(block)" v-bind="blockProps(block)" />
          </template>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const route = useRoute()
const { isOwner } = useRoles()
const playbook = ref<any>(null)
const loading = ref(true)

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
      return { innerHTML: block.text || '', class: 'font-bold' }
    case 'paragraph':
      return { innerHTML: block.text || '', class: 'text-gray-700 dark:text-slate-300' }
    case 'checklist':
      return {
        innerHTML: (block.items || []).map((item: any) =>
          `<li class="flex items-start gap-2"><span class="mt-0.5 w-4 h-4 border rounded flex-shrink-0 ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}"></span><span>${item.text || ''}</span></li>`
        ).join(''),
        class: 'list-none space-y-2'
      }
    case 'alert':
      return {
        innerHTML: block.text || '',
        class: `text-sm p-3 rounded-lg ${block.variant === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' : block.variant === 'danger' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`
      }
    default:
      return { innerHTML: block.text || block.content || '', class: 'text-gray-700 dark:text-slate-300' }
  }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }

onMounted(async () => {
  try {
    const slug = route.params.slug as string
    const data = await $fetch<any>(`/api/bo/playbooks/${slug}`)
    playbook.value = data.playbook
  } catch { /* 404 handled by template */ }
  finally { loading.value = false }
})
</script>
