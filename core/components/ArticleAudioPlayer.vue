<!--
  @author    CodeMyShop <noreply@codemyshop.com>
  @copyright 2026 CodeMyShop
  @license   AGPL-3.0-or-later

  ArticleAudioPlayer — lecteur audio inline pour articles blog
  Données audio depuis cs_cms_extra (audio_enabled + audio_url).
  Pas d'autoplay. Audio chargé en lazy (preload="metadata").
  Positionné en haut de l'article pour accessibilité (lecteurs d'écran).
-->
<template>
  <div v-if="audioUrl" class="mb-6 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-4" role="region" aria-label="Version audio de l'article">
    <div class="flex items-center gap-3 mb-3">
      <button
        @click="toggle"
        class="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shrink-0 transition-colors"
        :aria-label="isPlaying ? 'Mettre en pause' : 'Écouter cet article'"
      >
        <svg v-if="isPlaying" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
        <svg v-else class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-slate-800 dark:text-white">Écouter cet article</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          <span v-if="duration">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
          <span v-else>Version audio — voix IA</span>
        </p>
      </div>
    </div>

    <!-- Progress bar -->
    <div
      class="relative h-1.5 bg-slate-200 dark:bg-white/[0.08] rounded-full cursor-pointer"
      @click="seek"
      role="slider"
      :aria-valuenow="Math.round(currentTime)"
      :aria-valuemin="0"
      :aria-valuemax="Math.round(duration)"
      aria-label="Position dans l'audio"
    >
      <div
        class="absolute left-0 top-0 h-full bg-primary-500 rounded-full transition-all duration-200"
        :style="{ width: progress + '%' }"
      />
    </div>

    <audio
      ref="audioEl"
      :src="audioUrl"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onMetadata"
      @ended="onEnded"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  audioUrl: string
}>()

const audioEl = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

const progress = computed(() =>
  duration.value ? (currentTime.value / duration.value) * 100 : 0
)

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function toggle() {
  const el = audioEl.value
  if (!el) return
  if (isPlaying.value) {
    el.pause()
    isPlaying.value = false
  } else {
    el.play().then(() => { isPlaying.value = true }).catch(() => {})
  }
}

function seek(e: MouseEvent) {
  const el = audioEl.value
  if (!el || !duration.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  el.currentTime = ratio * duration.value
}

function onTimeUpdate() {
  if (audioEl.value) currentTime.value = audioEl.value.currentTime
}

function onMetadata() {
  if (audioEl.value) duration.value = audioEl.value.duration
}

function onEnded() {
  isPlaying.value = false
  currentTime.value = 0
}
</script>
