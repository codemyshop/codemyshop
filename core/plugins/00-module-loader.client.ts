

import '~/modules/faq/client/index'

const _clientSideEffectsCount = 1

export default defineNuxtPlugin(() => {
  if (_clientSideEffectsCount > 0) {
    console.log(`[module-loader] ${_clientSideEffectsCount} client side-effects loaded`)
  }
})
