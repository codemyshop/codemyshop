<!-- @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later -->
<template>
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center" @keydown.escape="$emit('close')" @keydown.left="prev" @keydown.right="next">

        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/70" @click="$emit('close')" />

        <!-- Container -->
        <div ref="containerRef" tabindex="0" class="relative z-10 flex flex-col items-center max-w-4xl w-full mx-4">

          <!-- Header -->
          <div class="flex items-center justify-between w-full mb-3">
            <p v-if="productName" class="text-sm text-white/80 font-medium truncate max-w-md">{{ productName }}</p>
            <span v-else />
            <div class="flex items-center gap-3">
              <span class="text-xs text-white/50">{{ current + 1 }} / {{ images.length }}</span>
              <button @click="$emit('close')" class="text-white/60 hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <!-- Image principale -->
          <div class="relative w-full flex items-center justify-center" style="min-height: 400px;">
            <!-- Fleche gauche -->
            <button
              v-if="images.length > 1"
              @click="prev"
              class="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-10"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            </button>

            <img
              :src="currentImageUrl"
              :alt="`${productName} — image ${current + 1}`"
              class="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
              @error="onImgError"
            />

            <!-- Fleche droite -->
            <button
              v-if="images.length > 1"
              @click="next"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-10"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>

          <!-- Thumbnails -->
          <div v-if="images.length > 1" class="flex items-center gap-2 mt-4 overflow-x-auto max-w-full py-1 px-1">
            <button
              v-for="(img, i) in images"
              :key="img"
              @click="current = i"
              class="shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all"
              :class="i === current ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-transparent opacity-60 hover:opacity-100'"
            >
              <img
                :src="buildUrl(img, 'small_default')"
                :alt="`Miniature ${i + 1}`"
                loading="lazy"
                class="w-full h-full object-cover"
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  images: number[]
  clientId: string
  productName?: string
  startIndex?: number
}>()

const emit = defineEmits<{ close: [] }>()

const current = ref(0)
const containerRef = ref<HTMLElement | null>(null)

function buildUrl(imageId: number, size: string) {
  return `/api/catalogue/image/${imageId}?clientId=${props.clientId}&size=${size}`
}

const currentImageUrl = computed(() => {
  if (!props.images.length) return ''
  return buildUrl(props.images[current.value], 'large_default')
})

function prev() {
  if (props.images.length <= 1) return
  current.value = (current.value - 1 + props.images.length) % props.images.length
}

function next() {
  if (props.images.length <= 1) return
  current.value = (current.value + 1) % props.images.length
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  // Fallback to home_default if large_default is missing
  if (img.src.includes('large_default')) {
    img.src = img.src.replace('large_default', 'home_default')
  }
}

// Focus on mount so keyboard input works
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    current.value = props.startIndex ?? 0
    nextTick(() => containerRef.value?.focus())
  }
})
</script>
