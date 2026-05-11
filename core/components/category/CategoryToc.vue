
<script setup lang="ts">
const { t } = useT()
interface TocItem {
  id: string
  label: string
}

const props = defineProps<{
  items: TocItem[]
}>()

const activeId = ref<string>(props.items[0]?.id ?? '')

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof window === 'undefined') return
  if (!('IntersectionObserver' in window)) return

  const targets = props.items
    .map(i => document.getElementById(i.id))
    .filter((el): el is HTMLElement => el !== null)

  if (targets.length === 0) return

  observer = new IntersectionObserver(
    entries => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible.length > 0) {
        activeId.value = visible[0].target.id
      }
    },
    {
      
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    },
  )
  targets.forEach(t => observer!.observe(t))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

function scrollTo(id: string, evt: Event) {
  evt.preventDefault()
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 80
  window.scrollTo({ top, behavior: 'smooth' })
  history.replaceState(null, '', `#${id}`)
  activeId.value = id
}
</script>

<template>
  <aside v-if="items.length > 0" class="hidden lg:block">
    <nav
      class="sticky top-24 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      :aria-label="t('silo.toc_title')"
    >
      <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {{ t('silo.toc_title') }}
      </p>
      <ul class="space-y-2 text-sm">
        <li v-for="item in items" :key="item.id">
          <a
            :href="`#${item.id}`"
            :aria-current="activeId === item.id ? 'true' : undefined"
            :class="[
              'block border-l-2 py-1 pl-3 transition-colors',
              activeId === item.id
                ? 'border-primary-600 font-semibold text-primary-800 dark:text-primary-400'
                : 'border-slate-200 text-slate-600 hover:border-primary-400 hover:text-primary-700 dark:border-slate-700 dark:text-slate-400',
            ]"
            @click="scrollTo(item.id, $event)"
          >
            {{ item.label }}
          </a>
        </li>
      </ul>
    </nav>
  </aside>
</template>
