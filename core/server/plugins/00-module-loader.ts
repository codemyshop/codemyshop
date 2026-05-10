/**
 * Nitro plugin — server-side module loader bootstrap.
 *
 * 1. Forces the import of manifests (already done by module-loader.ts) — log scan.
 * 2. Forces the import of `server/index.ts` of each module to trigger
 *    leurs registrations top-level (onAction, onFilter via hooks-bus).
 *
 * On the public OSS repo, internal/+enterprise/ are absent → globs
 * return {} without error.
 *
 * Chantier codemyshop-oss Phase 1.3 (2026-05-10).
 */
import { listAllManifests, manifestsByEdition } from '~/server/utils/module-loader'

// Auto-registration : chaque module qui a un server/index.ts voit son code
// top-level s'exécuter au boot (typiquement onAction/onFilter calls).
// Patterns relatifs au fichier (core/server/plugins/) — voir module-loader.ts
// pour la doctrine. Les patterns absolus `/core/...` crashent au boot Nitro.
const _serverGlobs = {
  ...import.meta.glob('../../modules/*/server/index.ts', { eager: true }),
  ...import.meta.glob('../../../enterprise/*/*/server/index.ts', { eager: true }),
  ...import.meta.glob('../../../internal/*/server/index.ts', { eager: true }),
}

export default defineNitroPlugin(() => {
  const all = listAllManifests()
  const byEd = manifestsByEdition()
  const serverModulesLoaded = Object.keys(_serverGlobs).length
  console.log(
    `[module-loader] ${all.length} manifests discovered ` +
    `(community: ${byEd.community.length}, ` +
    `enterprise: ${byEd.enterprise.length}, ` +
    `custom: ${byEd.custom.length}, ` +
    `internal: ${byEd.internal.length}) ` +
    `+ ${serverModulesLoaded} server side-effects loaded`
  )
})
