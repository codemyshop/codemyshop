/**
 *
 * Global middleware: automatically propagates the query param ?builder-preview=1
 * across all internal navigations performed within the builder iframe.
 *
 * Without this middleware, clicking a link in the iframe loads the new
 * page without the param → iframe detects "parent mode" → re-displays the
 * builder sidebar appearing twice (reported issue).
 */
export default defineNuxtRouteMiddleware((to, from) => {
  // Page courante en mode iframe preview → propager sur la suivante
  if (from.query['builder-preview'] === '1' && to.query['builder-preview'] !== '1') {
    return navigateTo({
      path: to.path,
      query: { ...to.query, 'builder-preview': '1' },
      hash: to.hash,
    })
  }
})
