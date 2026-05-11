

export default defineNuxtRouteMiddleware(async (to) => {
  
  if (!to.path.startsWith('/hub')) return

  
  if (to.path === '/suspended') return

  try {
    await $fetch('/api/hub/system-status', { timeout: 5000 })
  } catch (err: any) {
    if (err?.statusCode === 403) {
      return navigateTo('/suspended')
    }
    
  }
})
