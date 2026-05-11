

import { generateColorScale } from '~/utils/colorShades'
import type { BorderRadius, ContentWidth } from '~/types/theme'
import type { ThemeDbData } from '~/composables/useThemeDb'

const RADIUS_MAP: Record<BorderRadius, { btn: string; card: string; input: string }> = {
  none: { btn: '0',       card: '0',      input: '0' },
  sm:   { btn: '0.25rem', card: '0.375rem', input: '0.375rem' },
  md:   { btn: '0.5rem',  card: '0.5rem',  input: '0.5rem' },
  lg:   { btn: '0.5rem',  card: '0.75rem', input: '0.5rem' },
  full: { btn: '9999px',  card: '1rem',    input: '9999px' },
}

const CONTENT_WIDTH_MAP: Record<ContentWidth, string> = {
  '6xl': '72rem',
  '7xl': '80rem',
  '8xl': '90rem',
  full:  '100%',
}

export function useClientTheme() {
  const { config }     = useClientDetection()

  
  
  const { data: themeFetch } = useFetch<{ theme: ThemeDbData | null }>('/api/theme', {
    key: 'theme-db',
    default: () => ({ theme: null }),
  })

  
  const builderTheme = useState<ThemeDbData | null>('theme_builder_override', () => null)

  
  
  const dbConfig = useState<Record<string, unknown> | null>('client_db_config', () => null)

  
  
  
  
  
  const effectiveTheme = computed(() => {
    if (builderTheme.value?.colors?.primary) return builderTheme.value
    const dbRow = themeFetch.value?.theme
    if (dbRow?.colors?.primary) return dbRow
    const legacy = (dbConfig.value as any)?.theme
    if (legacy?.colors?.primary) {
      if (import.meta.dev) {
        console.warn('[useClientTheme] fallback legacy config_json.theme — installer ac_theme sur ce tenant')
      }
      return legacy
    }
    return undefined
  })

  const themeStyles = computed<Record<string, string>>(() => {
    const theme = effectiveTheme.value
    if (!theme) return {}

    const vars: Record<string, string> = {}

    
    if (theme.colors.primary) {
      const scale = generateColorScale(theme.colors.primary)
      for (const [shade, value] of Object.entries(scale)) {
        const key = shade === 'DEFAULT' ? '--color-primary' : `--color-primary-${shade}`
        vars[key] = value
      }
    }

    
    if (theme.colors.secondary) {
      const scale = generateColorScale(theme.colors.secondary)
      for (const [shade, value] of Object.entries(scale)) {
        const key = shade === 'DEFAULT' ? '--color-secondary' : `--color-secondary-${shade}`
        vars[key] = value
      }
    }

    
    if (theme.colors.background)  vars['--color-background']  = theme.colors.background
    if (theme.colors.foreground)  vars['--color-foreground']  = theme.colors.foreground
    if (theme.colors.muted)       vars['--color-muted']       = theme.colors.muted
    if (theme.colors.headerBg)    vars['--color-header-bg']   = theme.colors.headerBg
    if ((theme.colors as any).headerText) vars['--color-header-text'] = (theme.colors as any).headerText
    if (theme.colors.footerBg)    vars['--color-footer-bg']   = theme.colors.footerBg
    if ((theme.colors as any).footerText) vars['--color-footer-text'] = (theme.colors as any).footerText
    if (theme.colors.topBarBg)    vars['--color-topbar-bg']   = theme.colors.topBarBg
    if (theme.colors.topBarText)  vars['--color-topbar-text'] = theme.colors.topBarText

    
    if (theme.typography?.fontFamily)   vars['--font-family']      = theme.typography.fontFamily
    if (theme.typography?.baseFontSize) vars['--font-size-base']   = theme.typography.baseFontSize

    
    if (theme.ui?.borderRadius) {
      const r = RADIUS_MAP[theme.ui.borderRadius]
      vars['--radius-btn']   = r.btn
      vars['--radius-card']  = r.card
      vars['--radius-input'] = r.input
    }

    
    const cw = theme.ui?.contentWidth ?? '6xl'
    vars['--content-max-w'] = CONTENT_WIDTH_MAP[cw]

    return vars
  })

  
  const shadowClass = computed(() =>
    effectiveTheme.value?.ui?.shadow === false ? 'theme-no-shadow' : ''
  )

  
  const contentWidthClass = computed(() => {
    const cw = effectiveTheme.value?.ui?.contentWidth ?? '6xl'
    const map: Record<string, string> = {
      '6xl': 'max-w-6xl',
      '7xl': 'max-w-7xl',
      '8xl': 'max-w-[90rem]',
      full:  'max-w-full',
    }
    return map[cw] ?? 'max-w-6xl'
  })

  return { themeStyles, shadowClass, contentWidthClass, config }
}
