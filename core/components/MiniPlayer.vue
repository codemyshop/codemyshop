
<template>
  <div v-if="playlist.length" class="mt-8">
    <p class="text-xs text-gray-400 dark:text-slate-400 mb-2">En boucle dans mes écouteurs :</p>

    
    <div class="inline-flex items-center gap-3 bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-gray-200/60 dark:border-white/[0.08] rounded-full pl-1.5 pr-4 py-1.5 shadow-sm hover:shadow-md transition-shadow">

      
      <button
        @click="toggle"
        class="w-8 h-8 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shrink-0 transition-colors"
        :aria-label="isPlaying ? 'Pause' : 'Lecture'"
      >
        
        <svg v-if="isPlaying" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
        
        <svg v-else class="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      
      <div class="flex items-end gap-[2px] h-3.5 w-4 shrink-0">
        <span
          v-for="i in 3"
          :key="i"
          class="w-[3px] rounded-full transition-all duration-300"
          :class="isPlaying
            ? 'bg-primary-500 dark:bg-primary-400 animate-soundwave'
            : 'bg-gray-300 dark:bg-slate-600 h-1'"
          :style="isPlaying ? `animation-delay: ${(i - 1) * 150}ms` : ''"
        />
      </div>

      
      <div class="min-w-0">
        <p class="text-xs font-medium text-gray-800 dark:text-white truncate max-w-[180px] sm:max-w-[220px]">
          {{ currentTrack.title }}
        </p>
        <p class="text-[10px] text-gray-400 dark:text-slate-400 truncate max-w-[180px] sm:max-w-[220px]">
          {{ currentTrack.artist }}
        </p>
      </div>

      
      <button
        v-if="playlist.length > 1"
        @click="next"
        class="text-gray-400 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors ml-1"
        aria-label="Morceau suivant"
      >
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 5v14l8-7-8-7zm9 0v14h2V5h-2z" />
        </svg>
      </button>

    </div>

    
    <audio
      ref="audioEl"
      :src="currentTrack.src"
      preload="none"
      @ended="next"
    />
  </div>
</template>

<script setup lang="ts">
interface Track {
  title:  string
  artist: string
  src:    string
}

const playlist = ref<Track[]>([])
const currentIndex = ref(0)
const isPlaying = ref(false)
const audioEl = ref<HTMLAudioElement | null>(null)

const currentTrack = computed(() =>
  playlist.value[currentIndex.value] ?? { title: '', artist: '', src: '' }
)

async function loadPlaylist() {
  try {
    
    const data = await fetch('/music/playlist.json').then(r => r.json())
    
    playlist.value = (data as Track[]).filter(t => t.src)
  } catch {
    playlist.value = []
  }
}

function toggle() {
  const el = audioEl.value
  if (!el || !currentTrack.value.src) return
  if (isPlaying.value) {
    el.pause()
    isPlaying.value = false
  } else {
    el.play().then(() => { isPlaying.value = true }).catch(() => {})
  }
}

function next() {
  if (playlist.value.length <= 1) return
  const wasPlaying = isPlaying.value
  audioEl.value?.pause()
  isPlaying.value = false
  currentIndex.value = (currentIndex.value + 1) % playlist.value.length
  if (wasPlaying) {
    nextTick(() => {
      const el = audioEl.value
      if (!el) return
      el.load()
      el.play().then(() => { isPlaying.value = true }).catch(() => {})
    })
  }
}

onMounted(loadPlaylist)
</script>

<style scoped>
@keyframes soundwave {
  0%, 100% { height: 4px; }
  50%      { height: 14px; }
}
.animate-soundwave {
  animation: soundwave 0.8s ease-in-out infinite;
}
</style>
