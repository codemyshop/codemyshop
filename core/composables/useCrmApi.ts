

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
