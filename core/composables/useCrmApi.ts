/**
 * Composable for calls to PrestaShop CRM AJAX controllers.
 *
 * Goes through /api/bo/crm/call (server-side proxy) because Nginx does not route
 * /module/* to PS. The API token is injected server-side — the client
 * never sees it.
 */
export const useCrmApi = () => {
  const call = async <T = any>(
    module: string,
    controller: string,
    body: Record<string, any> = {},
  ): Promise<T> => {
    return await $fetch<T>('/api/bo/crm/call', {
      method: 'POST',
      body: { module, controller, body },
    })
  }

  return { call }
}
