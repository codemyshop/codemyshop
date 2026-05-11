

export const useAvailability = () => {
  const available   = useState<boolean>('availability_open', () => true)
  const remaining   = useState<number>('availability_remaining', () => 2)
  const maxClients  = useState<number>('availability_max', () => 2)
  const loaded      = useState<boolean>('availability_loaded', () => false)

  async function loadAvailability() {
    if (loaded.value) return
    try {
      const data = await $fetch<{
        maxClients: number
        currentClients: number
        available: boolean
      }>('/api/availability')
      available.value  = data.available
      remaining.value  = data.maxClients - data.currentClients
      maxClients.value = data.maxClients
      loaded.value     = true
    } catch {
      
      available.value = true
    }
  }

  if (import.meta.client && !loaded.value) {
    loadAvailability()
  }

  return { available, remaining, maxClients, loaded, loadAvailability }
}
