/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Composable useHooks — retrieves runtime hooks for a given target.
 *
 * Usage :
 *   const { hooks, pending } = useHooks('page', 'contact')
 *   const { hooks } = useHooks('page', 'contact', 'after_content')
 *
 * Hooks are sorted by slot then position. The <HookSlot /> component
 * consumes this composable to render components dynamically.
 */

export interface HookMount {
  id: number
  name: string
  targetType: string
  targetId: string
  slot: string
  component: string
  moduleName: string
  position: number
}

export function useHooks(
  targetType: string,
  targetId: string | number,
  slot?: string,
) {
  const key = `hooks:${targetType}:${targetId}:${slot || 'all'}`
  return useFetch<{ hooks: HookMount[]; error?: string }>('/api/hooks', {
    key,
    query: {
      target_type: targetType,
      target_id: String(targetId),
      ...(slot ? { slot } : {}),
    },
    default: () => ({ hooks: [] }),
    transform: (res) => ({ hooks: res?.hooks || [], error: res?.error }),
  })
}
