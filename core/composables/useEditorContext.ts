/**
 * Page context for Edit Mode.
 * Each page (catalog, product, blog, ...) registers here so that the
 * BuilderSidebar automatically displays the correct settings panel.
 *
 * Usage in a page:
 *   const { registerContext, clearContext } = useEditorContext()
 *   onMounted(() => registerContext('category', { slug: route.params.slug }))
 *   onUnmounted(() => clearContext())
 */

export const useEditorContext = () => {
  const contextPageId  = useState<string | null>('ed_ctx_page',    () => null)
  const contextPayload = useState<Record<string, unknown>>('ed_ctx_payload', () => ({}))

  /** Enregistre la page courante dans le contexte éditeur (onMounted uniquement). */
  function registerContext(pageId: string, payload?: Record<string, unknown>) {
    contextPageId.value  = pageId
    contextPayload.value = payload ?? {}
  }

  /** Cleans up the context on navigation (onUnmounted). */
  function clearContext() {
    contextPageId.value  = null
    contextPayload.value = {}
  }

  return { contextPageId, contextPayload, registerContext, clearContext }
}
