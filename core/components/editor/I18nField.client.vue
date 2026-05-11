

<template>
  <div class="i18n-field">
    
    <div class="flex gap-1 mb-1" v-if="langs.length > 1">
      <button
        v-for="lang in langs"
        :key="lang.iso_code"
        type="button"
        @click="activeLang = lang.iso_code"
        :class="[
          'text-[10px] font-semibold uppercase px-2 py-0.5 rounded transition-colors',
          activeLang === lang.iso_code
            ? 'bg-primary-600 text-white'
            : hasValue(lang.iso_code)
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
        ]"
        :title="lang.name + (hasValue(lang.iso_code) ? '' : ' (vide)')"
      >
        {{ lang.iso_code }}
      </button>
    </div>

    
    <textarea
      v-if="type === 'textarea'"
      :value="currentValue"
      @input="onInput(($event.target as HTMLTextAreaElement).value)"
      :placeholder="placeholder"
      class="field min-h-[60px]"
      rows="3"
    />
    <input
      v-else
      :value="currentValue"
      @input="onInput(($event.target as HTMLInputElement).value)"
      :placeholder="placeholder"
      type="text"
      class="field"
    />
  </div>
</template>

<script setup lang="ts">
import type { ClientLang } from '~/server/api/client-langs.get'
import type { I18nString } from '~/composables/useI18nField'

const props = withDefaults(defineProps<{
  modelValue: I18nString
  langs: ClientLang[]
  placeholder?: string
  type?: 'text' | 'textarea'
}>(), {
  type: 'text',
  placeholder: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

const defaultLang = computed(() => {
  const def = props.langs.find(l => l.is_default)
  return def?.iso_code || props.langs[0]?.iso_code || 'fr'
})

const activeLang = ref<string>(defaultLang.value)

watch(defaultLang, (l) => {
  if (!props.langs.find(x => x.iso_code === activeLang.value)) {
    activeLang.value = l
  }
}, { immediate: true })

function valueFor(iso: string): string {
  const v = props.modelValue
  if (v == null) return ''
  if (typeof v === 'string') {
    
    return iso === defaultLang.value ? v : ''
  }
  if (typeof v === 'object') {
    return typeof (v as Record<string, string>)[iso] === 'string'
      ? (v as Record<string, string>)[iso]
      : ''
  }
  return ''
}

const currentValue = computed(() => valueFor(activeLang.value))

function hasValue(iso: string): boolean {
  return valueFor(iso).length > 0
}

function onInput(newValue: string) {
  
  
  let next: Record<string, string> = {}
  const v = props.modelValue
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    next = { ...(v as Record<string, string>) }
  } else if (typeof v === 'string') {
    
    if (defaultLang.value && v) next[defaultLang.value] = v
  }
  next[activeLang.value] = newValue
  emit('update:modelValue', next)
}
</script>
