/**
 *
 * Composable for the builder's viewport mode (desktop / tablet / mobile) — like Shopify.
 * Shared state via useState (SSR-safe) + client-side localStorage persistence.
 * Supports portrait ↔ landscape rotation for mobile and tablet.
 */

export type ViewportMode = 'desktop' | 'tablet' | 'mobile'
export type ViewportOrientation = 'portrait' | 'landscape'

interface ViewportPreset {
  portrait:  { w: number; h: number } | null
  landscape: { w: number; h: number } | null
  label:     string
  canRotate: boolean
}

export const VIEWPORT_PRESETS: Record<ViewportMode, ViewportPreset> = {
  desktop: {
    portrait:  null,
    landscape: null,
    label:     'Desktop',
    canRotate: false,
  },
  tablet: {
    portrait:  { w: 820,  h: 1180 },
    landscape: { w: 1180, h: 820  },
    label:     'Tablette',
    canRotate: true,
  },
  mobile: {
    portrait:  { w: 390, h: 844 },
    landscape: { w: 844, h: 390 },
    label:     'Mobile',
    canRotate: true,
  },
}

const STORAGE_KEY_MODE = 'ed_viewport_mode'
const STORAGE_KEY_ORIENT = 'ed_viewport_orientation'

export function useEditorViewport() {
  const mode = useState<ViewportMode>('ed_viewport_mode', () => 'desktop')
  const orientation = useState<ViewportOrientation>('ed_viewport_orientation', () => 'portrait')

  if (import.meta.client) {
    // Hydrate depuis localStorage au mount (une seule fois)
    const hydrated = useState<boolean>('ed_viewport_hydrated', () => false)
    if (!hydrated.value) {
      const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as ViewportMode | null
      if (savedMode && (savedMode === 'desktop' || savedMode === 'tablet' || savedMode === 'mobile')) {
        mode.value = savedMode
      }
      const savedOrient = localStorage.getItem(STORAGE_KEY_ORIENT) as ViewportOrientation | null
      if (savedOrient === 'portrait' || savedOrient === 'landscape') {
        orientation.value = savedOrient
      }
      hydrated.value = true
    }
  }

  function setMode(m: ViewportMode) {
    mode.value = m
    if (import.meta.client) {
      try { localStorage.setItem(STORAGE_KEY_MODE, m) } catch { /* noop */ }
    }
  }

  function setOrientation(o: ViewportOrientation) {
    orientation.value = o
    if (import.meta.client) {
      try { localStorage.setItem(STORAGE_KEY_ORIENT, o) } catch { /* noop */ }
    }
  }

  function toggleOrientation() {
    setOrientation(orientation.value === 'portrait' ? 'landscape' : 'portrait')
  }

  const canRotate = computed(() => VIEWPORT_PRESETS[mode.value].canRotate)

  const currentDims = computed(() => {
    const preset = VIEWPORT_PRESETS[mode.value]
    return preset[orientation.value] // null pour desktop
  })

  const currentWidth  = computed(() => currentDims.value?.w ?? null)
  const currentHeight = computed(() => currentDims.value?.h ?? null)
  const isConstrained = computed(() => currentWidth.value !== null)

  /**
   * True when the layout is rendered inside a builder <iframe>
   * (mobile/tablet preview). Detection via query param ?builder-preview=1
   * to be SSR-safe (window.self != window.top is only available on the
   * client → hydration mismatch without the param).
   */
  const route = useRoute()
  const isInsideIframe = computed(() => route.query['builder-preview'] === '1')

  return {
    mode, setMode,
    orientation, setOrientation, toggleOrientation, canRotate,
    currentWidth, currentHeight, isConstrained,
    isInsideIframe,
  }
}
