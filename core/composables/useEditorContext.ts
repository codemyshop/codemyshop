

export const useEditorContext = () => {
  const contextPageId  = useState<string | null>('ed_ctx_page',    () => null)
  const contextPayload = useState<Record<string, unknown>>('ed_ctx_payload', () => ({}))

  
  function registerContext(pageId: string, payload?: Record<string, unknown>) {
    contextPageId.value  = pageId
    contextPayload.value = payload ?? {}
  }

  
  function clearContext() {
    contextPageId.value  = null
    contextPayload.value = {}
  }

  return { contextPageId, contextPayload, registerContext, clearContext }
}
