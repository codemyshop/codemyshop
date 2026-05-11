

export default defineNuxtRouteMiddleware((to, from) => {
  
  if (from.query['builder-preview'] === '1' && to.query['builder-preview'] !== '1') {
    return navigateTo({
      path: to.path,
      query: { ...to.query, 'builder-preview': '1' },
      hash: to.hash,
    })
  }
})
