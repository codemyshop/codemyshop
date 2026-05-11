
<template>
  <div
    v-if="visible"
    class="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1"
    role="tablist"
    :aria-label="$attrs['aria-label'] as string || 'Langue de rédaction'"
  >
    <button
      v-for="l in langs"
      :key="l.id_lang"
      type="button"
      role="tab"
      :aria-selected="l.id_lang === currentLangId"
      :title="l.name + (l.is_default ? ' — langue master (structure)' : ' — traduction')"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
      :class="l.id_lang === currentLangId
        ? 'bg-primary-600 text-white'
        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'"
      @click="setLang(l.id_lang)"
    >
      <span class="text-base leading-none">{{ flagEmoji(l.iso_code) }}</span>
      <span class="uppercase tracking-wide">{{ l.iso_code }}</span>
      <span
        v-if="l.is_default"
        class="ml-0.5 text-[9px] font-semibold"
        :class="l.id_lang === currentLangId ? 'text-white/80' : 'text-primary-600/70'"
      >★</span>
    </button>
  </div>
</template>

<script setup lang="ts">

const { langs, currentLangId, setLang } = useHubLang()

const visible = computed(() => (langs.value?.length || 0) > 1)

function flagEmoji(iso: string): string {
  const map: Record<string, string> = {
    fr: '🇫🇷',
    en: '🇬🇧',
    de: '🇩🇪',
    es: '🇪🇸',
    it: '🇮🇹',
    nl: '🇳🇱',
    pt: '🇵🇹',
    ar: '🇸🇦',
    zh: '🇨🇳',
    ja: '🇯🇵',
  }
  return map[iso?.toLowerCase?.()] || '🌐'
}
</script>
