/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Deep merge of two objects. Keys from `override` take priority.
 * Arrays are replaced (not concatenated).
 * Null/undefined values in override do not replace the base.
 */
export function deepMerge<T extends Record<string, any>>(base: T, override: Record<string, any>): T {
  const result = { ...base }
  for (const key of Object.keys(override)) {
    const val = override[key]
    if (val === null || val === undefined) continue
    if (
      typeof val === 'object' && !Array.isArray(val)
      && typeof result[key] === 'object' && !Array.isArray(result[key])
      && result[key] !== null
    ) {
      ;(result as any)[key] = deepMerge(result[key], val)
    } else {
      ;(result as any)[key] = val
    }
  }
  return result
}
