/**
 *
 * Builder geometry shared between the sidebar (BuilderSidebar.client.vue)
 * and the layout (white-label.vue) — so the content's margin-left
 * main follow real-time the sidebar's effective width (drag-
 * resize ou rail collapsed).
 *
 * Source of truth = shared `useState`. localStorage persistence client-side
 * sidebar uniquement (mount = chargement local).
 */

export const BUILDER_WIDTH_MIN = 320
export const BUILDER_WIDTH_MAX = 560
export const BUILDER_WIDTH_DEFAULT = 380
export const BUILDER_RAIL_WIDTH = 56

export const BUILDER_WIDTH_KEY = 'hub_builder_width'
export const BUILDER_COLLAPSED_KEY = 'hub_builder_collapsed'

export const useBuilderGeometry = () => {
  const builderWidth = useState<number>('builder_width', () => BUILDER_WIDTH_DEFAULT)
  const builderCollapsed = useState<boolean>('builder_collapsed', () => false)

  /** Largeur effective : rail si collapsed, sinon largeur custom. */
  const effectiveWidth = computed<number>(() =>
    builderCollapsed.value ? BUILDER_RAIL_WIDTH : builderWidth.value,
  )

  return {
    builderWidth,
    builderCollapsed,
    effectiveWidth,
  }
}
