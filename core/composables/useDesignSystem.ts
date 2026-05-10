/**
 *
 * Multi-tenant composable for Design Systems.
 * Loads the active theme for the tenant and exposes tokens
 * as reactive Tailwind classes.
 *
 * Architecture modeled after useFeatureFlag.ts:
 * - JSON catalog on the server (server/data/design-systems.json)
 * - Tenant → theme mapping via tenant-themes (or premium fallback)
 * - Client-side composable that exposes tokens
 */

export interface DesignSystemTokens {
  bgWow:          string
  bgWowDark:      string
  bgFlat:         string
  bgFlatDark:     string
  cardGlass:      string
  cardGlassDark:  string
  cardGlassHover: string
  badge:          string
  badgeDark:      string
  sectionAlt:     string
  sectionAltDark: string
  textHeading:    string
  textBody:       string
  textMuted:      string
  ctaPrimary:     string
  ctaSecondary:   string
  orbRose:        string
  orbViolet:      string
  orbIndigo:      string
}

export interface DesignSystem {
  id:          string
  name:        string
  description: string
  tokens:      DesignSystemTokens
}

// Tokens par défaut (ac-premium hardcodés pour le fallback SSR)
const DEFAULT_TOKENS: DesignSystemTokens = {
  bgWow:          'bg-gradient-to-br from-rose-50/60 via-white to-purple-50/40',
  bgWowDark:      'dark:bg-[#0f172a] dark:bg-none',
  bgFlat:         'bg-slate-50',
  bgFlatDark:     'dark:bg-slate-950',
  cardGlass:      'bg-white/70 backdrop-blur-xl border border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.04)]',
  cardGlassDark:  'dark:bg-white/[0.03] dark:backdrop-blur-sm dark:border-white/[0.06] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]',
  cardGlassHover: 'hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:hover:bg-white/[0.05] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]',
  badge:          'bg-white/80 backdrop-blur-sm text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full border',
  badgeDark:      'dark:bg-white/[0.06] dark:border-white/10',
  sectionAlt:     'bg-white',
  sectionAltDark: 'dark:bg-[#111827]',
  textHeading:    'text-gray-900 dark:text-white font-extrabold',
  textBody:       'text-gray-600 dark:text-slate-400 leading-relaxed',
  textMuted:      'text-gray-500 dark:text-slate-500',
  ctaPrimary:     'bg-primary-600 text-white hover:bg-primary-700 shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5',
  ctaSecondary:   'border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400',
  orbRose:        'bg-rose-500 blur-[130px] opacity-25 dark:opacity-[0.15]',
  orbViolet:      'bg-violet-600 blur-[120px] opacity-20 dark:opacity-[0.12]',
  orbIndigo:      'bg-indigo-500 blur-[100px] opacity-15 dark:opacity-[0.10]',
}

export const useDesignSystem = () => {
  const { resolvedClientId } = useClientDetection()
  const catalog = useState<DesignSystem[]>('design_systems', () => [])
  const activeThemeId = useState<string>('design_system_active', () => 'ac-premium')
  const loaded = useState('design_systems_loaded', () => false)

  /** Charge le catalogue depuis le JSON serveur */
  async function loadDesignSystems() {
    if (loaded.value) return
    try {
      catalog.value = await $fetch<DesignSystem[]>('/api/hub/design-systems', {
        query: { clientId: resolvedClientId.value },
      })
      loaded.value = true
    } catch {
      catalog.value = []
    }
  }

  /** Active theme resolved (fallback to default tokens) */
  const activeTheme = computed<DesignSystem>(() => {
    const found = catalog.value.find(ds => ds.id === activeThemeId.value)
    return found ?? { id: 'ac-premium', name: 'AC Premium', description: '', tokens: DEFAULT_TOKENS }
  })

  /** Shortcut: active theme tokens */
  const tokens = computed<DesignSystemTokens>(() => activeTheme.value.tokens)

  /** Change the active theme */
  function setTheme(themeId: string) {
    activeThemeId.value = themeId
  }

  // Auto-loads on the client at first call
  if (import.meta.client && !loaded.value) {
    loadDesignSystems()
  }

  return {
    catalog,
    activeTheme,
    activeThemeId,
    tokens,
    loaded,
    loadDesignSystems,
    setTheme,
  }
}
