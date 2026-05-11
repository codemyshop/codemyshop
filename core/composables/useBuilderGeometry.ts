

export const BUILDER_WIDTH_MIN = 320
export const BUILDER_WIDTH_MAX = 560
export const BUILDER_WIDTH_DEFAULT = 380
export const BUILDER_RAIL_WIDTH = 56

export const BUILDER_WIDTH_KEY = 'hub_builder_width'
export const BUILDER_COLLAPSED_KEY = 'hub_builder_collapsed'

export const useBuilderGeometry = () => {
  const builderWidth = useState<number>('builder_width', () => BUILDER_WIDTH_DEFAULT)
  const builderCollapsed = useState<boolean>('builder_collapsed', () => false)

  
  const effectiveWidth = computed<number>(() =>
    builderCollapsed.value ? BUILDER_RAIL_WIDTH : builderWidth.value,
  )

  return {
    builderWidth,
    builderCollapsed,
    effectiveWidth,
  }
}
