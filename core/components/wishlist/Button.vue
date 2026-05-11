
<template>
  <div class="inline-flex">
    <button
      type="button"
      :class="buttonClasses"
      :aria-label="isInAnyList ? t('wishlist.in_favorites') : t('wishlist.add_to_favorites')"
      @click.prevent.stop="onClick"
    >
      <svg class="w-5 h-5" :fill="isInAnyList ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
      <span v-if="variant === 'full'" class="ml-2 text-sm font-medium">
        {{ isInAnyList ? t('wishlist.in_favorites') : t('wishlist.add_to_favorites') }}
      </span>
    </button>

    
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="transition-opacity" leave-from-class="opacity-100" leave-to-class="opacity-0"
      >
        <div v-if="open" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" @click="open = false">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" @click.stop>
            <h3 class="text-base font-bold text-gray-900 mb-4">{{ t('wishlist.picker_title') }}</h3>

            <div v-if="!loggedIn" class="text-sm text-gray-600 mb-4">
              {{ t('wishlist.login_required') }}
              <NuxtLink :to="`/connexion?redirect=${encodeURIComponent(currentPath)}`" class="block mt-3 text-center px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold">
                {{ t('wishlist.cta_login') }}
              </NuxtLink>
            </div>

            <div v-else>
              <ul v-if="lists.length" class="space-y-1 max-h-72 overflow-y-auto mb-4">
                <li v-for="list in lists" :key="list.id_wishlist">
                  <button
                    @click="onToggleList(list.id_wishlist)"
                    :disabled="busy"
                    class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left"
                  >
                    <span class="flex items-center gap-2 min-w-0">
                      <svg v-if="containsMap[list.id_wishlist]" class="w-4 h-4 text-primary-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 111.42-1.42L8 12.59l7.29-7.29a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      <span v-else class="w-4 h-4 rounded border border-gray-300 shrink-0" />
                      <span class="text-sm text-gray-900 truncate">{{ list.name }}</span>
                      <span v-if="list.is_default" class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 shrink-0">{{ t('wishlist.default_badge') }}</span>
                    </span>
                    <span class="text-xs text-gray-400 shrink-0">{{ list.item_count }}</span>
                  </button>
                </li>
              </ul>

              <div v-if="creating" class="flex gap-2 mb-3">
                <input
                  v-model="newName"
                  type="text"
                  :placeholder="t('wishlist.new_list_placeholder')"
                  maxlength="64"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                  @keyup.enter="onCreate"
                >
                <button
                  @click="onCreate"
                  :disabled="!newName.trim() || busy"
                  class="px-3 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {{ t('wishlist.cta_create') }}
                </button>
              </div>

              <button
                v-else
                @click="creating = true"
                class="w-full px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:text-primary-600 hover:border-primary-400 transition-colors"
              >
                {{ t('wishlist.cta_new_list') }}
              </button>
            </div>

            <div class="flex justify-between items-center mt-5">
              <NuxtLink v-if="loggedIn && lists.length" to="/favoris" class="text-xs text-gray-500 hover:text-primary-600 underline">
                {{ t('wishlist.cta_manage') }}
              </NuxtLink>
              <button @click="open = false" class="ml-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                {{ t('wishlist.cta_close') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  productId: number
  attributeId?: number
  variant?: 'icon' | 'full'
}>(), {
  attributeId: 0,
  variant: 'icon',
})

const { t } = useT()
const { loggedIn } = useCustomerAuth()
const { lists, loadLists, createList, addItem, removeItem } = useWishlist()

const route = useRoute()
const currentPath = computed(() => route.fullPath)

const open = ref(false)
const creating = ref(false)
const newName = ref('')
const busy = ref(false)

const containsMap = ref<Record<number, boolean>>({})
const isInAnyList = computed(() => Object.values(containsMap.value).some(Boolean))

const buttonClasses = computed(() => {
  const base = 'inline-flex items-center justify-center rounded-full transition-colors'
  if (props.variant === 'full') {
    return `${base} px-4 py-2 border ${isInAnyList.value
      ? 'border-primary-600 text-primary-600 bg-primary-50'
      : 'border-gray-300 text-gray-700 hover:border-primary-400 hover:text-primary-600'}`
  }
  return `${base} w-9 h-9 ${isInAnyList.value
    ? 'text-primary-600 bg-primary-50'
    : 'text-gray-500 bg-white/80 hover:text-primary-600 hover:bg-primary-50'}`
})

async function onClick() {
  if (!loggedIn.value) {
    
    navigateTo(`/connexion?redirect=${encodeURIComponent(currentPath.value)}`)
    return
  }
  open.value = true
  await ensureLoaded()
  await refreshContainsMap()
}

async function ensureLoaded() {
  if (!lists.value.length) await loadLists()
}

async function refreshContainsMap() {
  
  const map: Record<number, boolean> = {}
  await Promise.all(lists.value.map(async (l) => {
    try {
      const res = await $fetch<{ items: { id_product: number; id_product_attribute: number }[] }>(
        `/api/wishlist/lists/${l.id_wishlist}/items`,
      )
      map[l.id_wishlist] = (res.items || []).some(it =>
        it.id_product === props.productId && it.id_product_attribute === (props.attributeId || 0),
      )
    } catch {
      map[l.id_wishlist] = false
    }
  }))
  containsMap.value = map
}

async function onToggleList(idWishlist: number) {
  if (busy.value) return
  busy.value = true
  try {
    if (containsMap.value[idWishlist]) {
      await removeItem(idWishlist, props.productId, props.attributeId)
      containsMap.value[idWishlist] = false
    } else {
      await addItem(idWishlist, props.productId, props.attributeId, 1)
      containsMap.value[idWishlist] = true
    }
  } finally {
    busy.value = false
  }
}

async function onCreate() {
  if (!newName.value.trim() || busy.value) return
  busy.value = true
  try {
    const created = await createList(newName.value.trim())
    newName.value = ''
    creating.value = false
    if (created) {
      await addItem(created.id_wishlist, props.productId, props.attributeId, 1)
      containsMap.value[created.id_wishlist] = true
    }
  } finally {
    busy.value = false
  }
}
</script>
