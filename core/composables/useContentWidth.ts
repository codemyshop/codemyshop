/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Returns the Tailwind max-w-* class corresponding to contentWidth
 * configured in the Builder (Theme > Interface > Central column width).
 * Default: max-w-6xl (72rem / 1152px).
 */
export function useContentWidth(): Ref<string> {
  return inject('contentWidthClass', ref('max-w-6xl'))
}
