
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

      <NuxtLink to="/" class="text-sm text-primary-600 hover:underline mb-4 inline-flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {{ t('favoris.favoris_home_link', 'Retour au site') }}
      </NuxtLink>

      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-4 mb-8">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <svg class="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21s-8-4.78-8-12c0-2.485 2.099-4.5 4.688-4.5 1.935 0 3.597 1.126 4.312 2.733.715-1.607 2.377-2.733 4.313-2.733C19.9 3.75 22 5.765 22 8.25c0 7.22-10 12-10 12z" />
            </svg>
            {{ t('favoris.favoris_page_title', 'Mes favoris') }}
          </h1>
          <p v-if="loggedIn" class="text-sm text-gray-500 mt-1">
            {{ itemTotal }} {{ t('favoris.favoris_item_count_label', 'produit(s)') }} · {{ lists.length }} {{ t('favoris.favoris_list_count_label', 'liste(s)') }}
          </p>
        </div>

        <button
          v-if="loggedIn"
          @click="showCreate = true"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {{ t('favoris.favoris_new_list_button', 'Nouvelle liste') }}
        </button>
      </div>

      <div v-if="loading && !loaded" class="text-center py-16 text-gray-400 text-sm">
        {{ t('common.common_loading', 'Chargement…') }}
      </div>

      <div v-else-if="!loggedIn" class="bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <p class="text-gray-600 mb-4">{{ t('favoris.favoris_login_required', 'Connectez-vous pour consulter vos listes de favoris.') }}</p>
        <NuxtLink to="/connexion?redirect=/favoris" class="inline-flex px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold">
          {{ t('favoris.favoris_login_link', 'Se connecter') }}
        </NuxtLink>
      </div>

      <div v-else-if="!lists.length" class="bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <p class="text-gray-600 mb-4">{{ t('favoris.favoris_no_lists', 'Vous n\'avez pas encore de liste de favoris.') }}</p>
        <button
          @click="showCreate = true"
          class="inline-flex px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold"
        >
          {{ t('favoris.favoris_create_first_list', 'Créer ma première liste') }}
        </button>
      </div>

      <ul v-else class="grid gap-4 sm:grid-cols-2">
        <li
          v-for="list in lists"
          :key="list.id_wishlist"
          class="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 hover:border-primary-300 transition-colors"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <NuxtLink :to="`/favoris/${list.id_wishlist}`" class="text-base font-semibold text-gray-900 hover:text-primary-600 truncate">
                  {{ list.name }}
                </NuxtLink>
                <span v-if="list.is_default" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-50 text-primary-600">
                  {{ t('favoris.favoris_default_badge', 'Par défaut') }}
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{ list.item_count }} {{ t('favoris.favoris_items_count_in_card', 'produit(s)') }}
              </p>
            </div>

            <div class="relative">
              <button
                @click.stop="menuOpenId = menuOpenId === list.id_wishlist ? null : list.id_wishlist"
                class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                :aria-label="t('common.common_options', 'Options')"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                </svg>
              </button>
              <div
                v-if="menuOpenId === list.id_wishlist"
                class="absolute right-0 top-8 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1"
                @click.stop
              >
                <button @click="startRename(list)" class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{{ t('favoris.favoris_rename_button', 'Renommer') }}</button>
                <button
                  v-if="!list.is_default"
                  @click="onSetDefault(list.id_wishlist)"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  {{ t('favoris.favoris_set_default_button', 'Définir par défaut') }}
                </button>
                <button
                  @click="onDelete(list)"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600"
                >
                  {{ t('favoris.favoris_delete_button', 'Supprimer') }}
                </button>
              </div>
            </div>
          </div>

          <NuxtLink
            :to="`/favoris/${list.id_wishlist}`"
            class="text-xs font-medium text-primary-600 hover:underline self-start"
          >
            {{ t('favoris.favoris_view_list_link', 'Voir la liste →') }}
          </NuxtLink>
        </li>
      </ul>

    </div>

    
    <Transition
      enter-active-class="transition-opacity" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition-opacity" leave-from-class="opacity-100" leave-to-class="opacity-0"
    >
      <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click="showCreate = false">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" @click.stop>
          <h3 class="text-lg font-bold text-gray-900 mb-4">{{ t('favoris.favoris_create_modal_title', 'Nouvelle liste') }}</h3>
          <input
            v-model="newName"
            type="text"
            :placeholder="t('favoris.favoris_new_list_placeholder', 'Ex. Sélection de Noël')"
            maxlength="64"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            @keyup.enter="onCreate"
          >
          <div class="flex justify-end gap-2 mt-4">
            <button @click="showCreate = false" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">{{ t('common.common_cancel', 'Annuler') }}</button>
            <button
              @click="onCreate"
              :disabled="!newName.trim() || busy"
              class="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {{ t('common.common_create', 'Créer') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    
    <Transition
      enter-active-class="transition-opacity" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition-opacity" leave-from-class="opacity-100" leave-to-class="opacity-0"
    >
      <div v-if="renameTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click="renameTarget = null">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" @click.stop>
          <h3 class="text-lg font-bold text-gray-900 mb-4">{{ t('favoris.favoris_rename_modal_title', 'Renommer la liste') }}</h3>
          <input
            v-model="renameValue"
            type="text"
            maxlength="64"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            @keyup.enter="onRename"
          >
          <div class="flex justify-end gap-2 mt-4">
            <button @click="renameTarget = null" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">{{ t('common.common_cancel', 'Annuler') }}</button>
            <button
              @click="onRename"
              :disabled="!renameValue.trim() || busy"
              class="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {{ t('common.common_save', 'Enregistrer') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const { t } = useHubT()
const { loggedIn } = useCustomerAuth()
const {
  lists, loaded, loading, itemTotal,
  loadLists, createList, renameList, setDefault, deleteList,
} = useWishlist()

useHead({ title: t('favoris.favoris_page_title', 'Mes favoris') })
definePageMeta({ layout: 'default' })

const showCreate = ref(false)
const newName = ref('')
const renameTarget = ref<{ id_wishlist: number; name: string } | null>(null)
const renameValue = ref('')
const menuOpenId = ref<number | null>(null)
const busy = ref(false)

onMounted(() => { loadLists() })
if (import.meta.client) {
  window.addEventListener('click', () => { menuOpenId.value = null })
}

async function onCreate() {
  if (!newName.value.trim() || busy.value) return
  busy.value = true
  try {
    await createList(newName.value.trim())
    showCreate.value = false
    newName.value = ''
  } finally {
    busy.value = false
  }
}

function startRename(list: { id_wishlist: number; name: string }) {
  menuOpenId.value = null
  renameTarget.value = { id_wishlist: list.id_wishlist, name: list.name }
  renameValue.value = list.name
}

async function onRename() {
  if (!renameTarget.value || !renameValue.value.trim() || busy.value) return
  busy.value = true
  try {
    await renameList(renameTarget.value.id_wishlist, renameValue.value.trim())
    renameTarget.value = null
  } finally {
    busy.value = false
  }
}

async function onSetDefault(id: number) {
  menuOpenId.value = null
  await setDefault(id)
}

async function onDelete(list: { id_wishlist: number; name: string; item_count: number }) {
  menuOpenId.value = null
  const confirmMsg = list.item_count > 0
    ? t('favoris.favoris_delete_confirm_with_count', 'Supprimer « {name} » et ses {count} produit(s) ?')
        .replace('{name}', list.name)
        .replace('{count}', String(list.item_count))
    : t('favoris.favoris_delete_confirm_empty', 'Supprimer « {name} » ?').replace('{name}', list.name)
  if (!confirm(confirmMsg)) return
  await deleteList(list.id_wishlist)
}
</script>
