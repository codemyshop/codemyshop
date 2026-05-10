<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">Images du produit</h2>
      <span class="text-[10px] uppercase tracking-wide text-gray-400">{{ images.length }} image(s)</span>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <!-- Upload placeholder — always first -->
      <button
        type="button"
        @click="$emit('upload-request')"
        class="group aspect-square flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40 rounded-lg hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-950/20 transition-colors"
      >
        <svg class="w-8 h-8 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
        </svg>
        <span class="text-[11px] font-medium text-gray-500 group-hover:text-primary-600">Ajouter</span>
      </button>

      <!-- Images existantes -->
      <div
        v-for="(img, index) in displayImages"
        :key="img.id || index"
        class="relative aspect-square rounded-lg overflow-hidden border border-gray-100 dark:border-slate-800 bg-gray-100 dark:bg-slate-800 group"
      >
        <img
          v-if="img.url"
          :src="img.url"
          :alt="`Image ${index + 1}`"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <svg class="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </div>

        <!-- Cover badge on index 0 -->
        <div
          v-if="index === 0"
          class="absolute bottom-0 inset-x-0 bg-gray-900/70 backdrop-blur-sm text-white text-[10px] font-medium text-center py-1"
        >
          Image de couverture
        </div>

        <!-- Action supprimer au hover -->
        <button
          type="button"
          @click="$emit('remove', img.id)"
          class="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 dark:bg-slate-900/90 text-gray-600 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-red-500 hover:text-white"
          aria-label="Supprimer l'image"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <p v-if="!images.length" class="text-[11px] text-gray-400">
      Aucune image. Les emplacements ci-dessus sont des exemples.
    </p>
  </div>
</template>

<script setup lang="ts">
interface ProductImage {
  id: number | string
  url?: string
  cover?: boolean
  position?: number
}

const props = defineProps<{ images: ProductImage[] }>()

defineEmits<{
  (e: 'upload-request'): void
  (e: 'remove', id: number | string): void
}>()

// Mock 3 visual placeholders when no image exists, so the grid is visible
const mockImages: ProductImage[] = [
  { id: 'mock-1' },
  { id: 'mock-2' },
  { id: 'mock-3' },
]

const displayImages = computed<ProductImage[]>(() =>
  props.images.length ? props.images : mockImages
)
</script>
