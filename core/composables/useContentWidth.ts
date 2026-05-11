

export function useContentWidth(): Ref<string> {
  return inject('contentWidthClass', ref('max-w-6xl'))
}
