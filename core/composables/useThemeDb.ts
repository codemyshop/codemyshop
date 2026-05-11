

export interface ThemeDbData {
  colors: {
    primary: string
    secondary?: string | null
    background?: string | null
    foreground?: string | null
    muted?: string | null
    headerBg?: string | null
    footerBg?: string | null
    topBarBg?: string | null
    topBarText?: string | null
  }
  typography: {
    fontFamily?: string | null
    fontUrl?: string | null
    baseFontSize?: string | null
  }
  ui: {
    borderRadius: string
    contentWidth?: string | null
    shadow: boolean
  }
  defaultColorMode?: 'light' | 'dark' | 'system'
}

const DEFAULT_THEME: ThemeDbData = {
  colors: { primary: '#2563eb' },
  typography: { fontFamily: 'Inter, system-ui, sans-serif' },
  ui: { borderRadius: 'md', shadow: true },
}

export function useThemeDb() {
  const { data, status } = useFetch<{ theme: ThemeDbData | null }>('/api/theme', {
    key: 'theme-db',
    default: () => ({ theme: null }),
  })

  
  const builderTheme = useState<ThemeDbData | null>('theme_builder_override', () => null)

  
  const theme = computed<ThemeDbData>(() => {
    if (builderTheme.value) return builderTheme.value
    if (data.value?.theme) return data.value.theme
    return DEFAULT_THEME
  })

  
  function loadIntoBuilder() {
    builderTheme.value = JSON.parse(JSON.stringify(data.value?.theme || DEFAULT_THEME))
  }

  
  function updateBuilderTheme(patch: Partial<ThemeDbData>) {
    if (!builderTheme.value) loadIntoBuilder()
    builderTheme.value = {
      ...builderTheme.value!,
      ...patch,
      colors: { ...builderTheme.value!.colors, ...patch.colors },
      typography: { ...builderTheme.value!.typography, ...patch.typography },
      ui: { ...builderTheme.value!.ui, ...patch.ui },
    }
  }

  function updateColor(key: string, value: string) {
    if (!builderTheme.value) loadIntoBuilder()
    builderTheme.value = {
      ...builderTheme.value!,
      colors: { ...builderTheme.value!.colors, [key]: value },
    }
  }

  function updateTypography(key: string, value: string) {
    if (!builderTheme.value) loadIntoBuilder()
    builderTheme.value = {
      ...builderTheme.value!,
      typography: { ...builderTheme.value!.typography, [key]: value },
    }
  }

  function updateUi(key: string, value: string | boolean) {
    if (!builderTheme.value) loadIntoBuilder()
    builderTheme.value = {
      ...builderTheme.value!,
      ui: { ...builderTheme.value!.ui, [key]: value },
    }
  }

  
  async function syncToDb() {
    if (!builderTheme.value) return
    await $fetch('/api/theme/sync', {
      method: 'PUT',
      body: { theme: builderTheme.value },
    })
    await refreshNuxtData('theme-db')
  }

  function clearBuilderOverride() {
    builderTheme.value = null
  }

  return {
    theme,
    status,
    builderTheme,
    loadIntoBuilder,
    updateBuilderTheme,
    updateColor,
    updateTypography,
    updateUi,
    syncToDb,
    clearBuilderOverride,
  }
}
