

export default defineNuxtPlugin(async () => {
  try {
    const res = await $fetch<{ flags: Record<string, string> }>('/api/configuration/flags-public')
    useState('ps_flags', () => res?.flags ?? {})
  } catch {
    useState('ps_flags', () => ({}))
  }
})
