/**
 * Nuxt client plugin — front-end module loader boot.
 *
 * Force the import of `client/index.ts` from each module to trigger
 * leurs registrations top-level (typiquement provideSlot via useDisplaySlot).
 *
 * On the public OSS repo, internal/+enterprise/ are absent → globs
 * return {} without error (clean double-distribution).
 *
 * Chantier codemyshop-oss Phase 1.3 (2026-05-10).
 */

const _clientGlobs = {
  ...import.meta.glob('/core/modules/*/client/index.ts', { eager: true }),
  ...import.meta.glob('/enterprise/*/*/client/index.ts', { eager: true }),
  ...import.meta.glob('/internal/*/client/index.ts', { eager: true }),
}

export default defineNuxtPlugin(() => {
  const loaded = Object.keys(_clientGlobs).length
  if (loaded > 0) {
    console.log(`[module-loader] ${loaded} client side-effects loaded`)
  }
})
