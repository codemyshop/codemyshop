

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
