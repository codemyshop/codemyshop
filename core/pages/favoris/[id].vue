<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  /favoris/[id] — Détail d'une liste : items + CTA "Envoyer par email".
-->
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

      <NuxtLink to="/favoris" class="text-sm text-primary-600 hover:underline mb-4 inline-flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {{ t('favoris.favoris_back_link', 'Mes favoris') }}
      </NuxtLink>

      <div v-if="list" class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-4 mb-8">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">{{ list.name }}</h1>
          <p class="text-sm text-gray-500 mt-1">
            {{ items.length }} {{ t('favoris.favoris_items_count_label', 'produit(s)') }}
            <span v-if="list.is_default">{{ t('favoris.favoris_is_default_label', '· Liste par défaut') }}</span>
          </p>
        </div>

        <button
          v-if="items.length"
          @click="showEmail = true"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          {{ t('favoris.favoris_send_email_button', 'Envoyer par email') }}
        </button>
      </div>

      <div v-if="loading" class="text-center py-16 text-gray-400 text-sm">{{ t('common.common_loading', 'Chargement…') }}</div>

      <div v-else-if="!list" class="bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <p class="text-gray-600 mb-4">{{ t('favoris.favoris_not_found', 'Liste introuvable.') }}</p>
        <NuxtLink to="/favoris" class="inline-flex px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold">
          {{ t('favoris.favoris_back_button', 'Retour à mes favoris') }}
        </NuxtLink>
      </div>

      <div v-else-if="!items.length" class="bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <p class="text-gray-600">{{ t('favoris.favoris_empty_list', 'Cette liste est vide.') }}</p>
        <NuxtLink to="/catalogue" class="inline-flex mt-4 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold">
          {{ t('favoris.favoris_browse_catalog', 'Parcourir le catalogue') }}
        </NuxtLink>
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="item in items"
          :key="item.id_wishlist_product"
          class="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:border-primary-300 transition-colors"
        >
          <NuxtLink :to="`/produit/${item.id_product}`" class="shrink-0">
            <div class="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
              <img
                v-if="item.id_image"
                :src="productImage(item)"
                :alt="item.product_name"
                class="w-full h-full object-cover"
                loading="lazy"
              >
              <svg v-else class="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
          </NuxtLink>

          <div class="min-w-0 flex-1">
            <NuxtLink :to="`/produit/${item.id_product}`" class="text-sm font-semibold text-gray-900 hover:text-primary-600 line-clamp-2">
              {{ item.product_name }}
            </NuxtLink>
            <p class="text-xs text-gray-500 mt-1">
              Qté {{ item.quantity }}<span v-if="item.reference"> {{ t('favoris.favoris_ref_label', '· Réf.') }} {{ item.reference }}</span>
            </p>
          </div>

          <button
            @click="onRemove(item)"
            class="shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            :aria-label="t('favoris.favoris_remove_button', 'Retirer')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.2v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </li>
      </ul>

    </div>

    <!-- Modal envoi email -->
    <Transition
      enter-active-class="transition-opacity" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition-opacity" leave-from-class="opacity-100" leave-to-class="opacity-0"
    >
      <div v-if="showEmail" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click="closeEmail">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" @click.stop>
          <h3 class="text-lg font-bold text-gray-900 mb-1">{{ t('favoris.favoris_email_modal_title', 'Envoyer cette liste par email') }}</h3>
          <p class="text-xs text-gray-500 mb-4">{{ t('favoris.favoris_email_modal_subtitle', 'Partagez « {listname} » avec un collègue ou votre équipe.').replace('{listname}', list?.name || '') }}</p>

          <label class="block text-xs font-semibold text-gray-700 mb-1">{{ t('favoris.favoris_email_to_label', 'Destinataire') }}</label>
          <input
            v-model="emailTo"
            type="email"
            :placeholder="t('favoris.favoris_email_placeholder', 'nom@exemple.com')"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
          >

          <label class="block text-xs font-semibold text-gray-700 mt-4 mb-1">{{ t('favoris.favoris_email_message_label', 'Message (optionnel)') }}</label>
          <textarea
            v-model="emailMsg"
            rows="3"
            maxlength="5000"
            :placeholder="t('favoris.favoris_email_message_placeholder', 'Un mot pour accompagner la liste…')"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
          />

          <p v-if="emailResult" class="mt-3 text-xs" :class="emailResult.ok ? 'text-emerald-600' : 'text-red-600'">
            {{ emailResult.msg }}
          </p>

          <div class="flex justify-end gap-2 mt-5">
            <button @click="closeEmail" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">{{ t('common.common_close', 'Fermer') }}</button>
            <button
              @click="onSendEmail"
              :disabled="!validEmail || sending"
              class="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {{ sending ? t('favoris.favoris_email_send_button_loading', 'Envoi…') : t('favoris.favoris_email_send_button_idle', 'Envoyer') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { WishlistItem } from '~/composables/useWishlist'

const { t } = useHubT()
const route = useRoute()
const id = computed(() => Number(route.params.id))

const { lists, loadLists, fetchItems, removeItem, sendByEmail } = useWishlist()

const items = ref<WishlistItem[]>([])
const loading = ref(true)
const list = computed(() => lists.value.find(l => l.id_wishlist === id.value) || null)

useHead(() => ({ title: list.value ? list.value.name : 'Ma liste' }))
definePageMeta({ layout: 'default' })

const showEmail = ref(false)
const emailTo = ref('')
const emailMsg = ref('')
const sending = ref(false)
const emailResult = ref<{ ok: boolean; msg: string } | null>(null)

const validEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo.value.trim()))

onMounted(async () => {
  await Promise.all([loadLists(), refreshItems()])
  loading.value = false
})

watch(id, async () => {
  loading.value = true
  await refreshItems()
  loading.value = false
})

async function refreshItems() {
  if (!Number.isFinite(id.value) || id.value <= 0) return
  try {
    items.value = await fetchItems(id.value)
  } catch {
    items.value = []
  }
}

function productImage(item: WishlistItem): string {
  if (!item.id_image) return ''
  const slug = item.link_rewrite || 'product'
  return `/${item.id_image}-home_default/${encodeURIComponent(slug)}.jpg`
}

async function onRemove(item: WishlistItem) {
  await removeItem(id.value, item.id_product, item.id_product_attribute)
  await refreshItems()
}

async function onSendEmail() {
  if (!validEmail.value || sending.value) return
  sending.value = true
  emailResult.value = null
  try {
    const ok = await sendByEmail(id.value, emailTo.value.trim(), emailMsg.value.trim())
    emailResult.value = ok
      ? { ok: true, msg: `Liste envoyée à ${emailTo.value.trim()}.` }
      : { ok: false, msg: 'Envoi impossible. Réessayez plus tard.' }
    if (ok) {
      emailTo.value = ''
      emailMsg.value = ''
      setTimeout(() => { showEmail.value = false; emailResult.value = null }, 1800)
    }
  } catch (err: any) {
    emailResult.value = { ok: false, msg: err?.data?.message || err?.message || 'Erreur réseau.' }
  } finally {
    sending.value = false
  }
}

function closeEmail() {
  showEmail.value = false
  emailResult.value = null
}
</script>
