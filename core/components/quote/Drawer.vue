
<script setup lang="ts">
const { isOpen, close } = useQuoteDrawer()
const { items, updateQuantity, removeFromQuote, totalItems } = useQuoteCart()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) close()
}

onMounted(() => {
  if (import.meta.client) document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  if (import.meta.client) document.removeEventListener('keydown', onKeydown)
})

watch(isOpen, (val) => {
  if (!import.meta.client) return
  document.body.style.overflow = val ? 'hidden' : ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="quote-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        @click="close"
      />
    </Transition>

    <Transition name="quote-slide">
      <aside
        v-if="isOpen"
        class="fixed inset-y-0 right-0 z-[101] w-full sm:w-[440px] bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-drawer-title"
      >
        
        <header class="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2
            id="quote-drawer-title"
            class="text-base font-bold text-gray-900 flex items-center gap-2"
          >
            Mon devis
            <span
              v-if="totalItems"
              class="text-xs font-semibold text-gray-400"
            >({{ totalItems }} article{{ totalItems > 1 ? 's' : '' }})</span>
          </h2>
          <button
            type="button"
            class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Fermer le devis"
            @click="close"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        
        <div class="px-5 py-3 border-b border-gray-100 shrink-0 bg-amber-50">
          <p class="text-xs text-amber-700">
            Les prix seront communiqués dans votre devis personnalisé.
          </p>
        </div>

        
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <div v-if="items.length" class="space-y-3">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex items-start gap-3 py-3 border-b border-gray-50 last:border-b-0"
            >
              <div class="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                <img
                  v-if="item.image"
                  :src="item.image"
                  :alt="item.name"
                  class="w-full h-full object-contain p-1.5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">
                  {{ item.name }}
                </h3>
                <p v-if="item.reference" class="text-[10px] text-gray-400 mt-0.5">
                  Réf. {{ item.reference }}
                </p>
                <div class="flex items-center justify-between mt-2">
                  <div class="flex items-center border border-gray-200 rounded-md">
                    <button
                      type="button"
                      class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 text-sm"
                      @click="updateQuantity(item.id, item.quantity - 1)"
                    >−</button>
                    <span class="w-7 h-7 flex items-center justify-center text-xs font-semibold text-gray-900">
                      {{ item.quantity }}
                    </span>
                    <button
                      type="button"
                      class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 text-sm"
                      @click="updateQuantity(item.id, item.quantity + 1)"
                    >+</button>
                  </div>
                  <button
                    type="button"
                    class="text-gray-300 hover:text-red-500 transition-colors"
                    @click="removeFromQuote(item.id)"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          
          <div v-else class="text-center py-16">
            <svg class="w-14 h-14 mx-auto text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p class="text-gray-500 text-sm mb-1">Votre devis est vide</p>
            <p class="text-xs text-gray-400">Ajoutez des produits pour demander un devis</p>
          </div>
        </div>

        
        <footer
          v-if="items.length"
          class="border-t border-gray-100 px-5 py-4 shrink-0 bg-gray-50/50"
        >
          <p class="text-xs text-gray-500 mb-3">
            {{ totalItems }} article{{ totalItems > 1 ? 's' : '' }} dans votre demande
          </p>

          <NuxtLink
            to="/devis"
            class="block w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm text-center transition-colors"
            @click="close"
          >
            Demander un devis
          </NuxtLink>
          <button
            type="button"
            class="block w-full mt-2 py-2 text-center text-xs text-gray-500 hover:text-primary-600 transition-colors"
            @click="close"
          >
            Continuer ma sélection
          </button>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.quote-fade-enter-active,
.quote-fade-leave-active {
  transition: opacity 250ms ease;
}
.quote-fade-enter-from,
.quote-fade-leave-to {
  opacity: 0;
}

.quote-slide-enter-active,
.quote-slide-leave-active {
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
}
.quote-slide-enter-from,
.quote-slide-leave-to {
  transform: translateX(100%);
}
</style>
