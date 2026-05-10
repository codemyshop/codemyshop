/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/hub/backups/list
 *
 * Lists the current tenant's DB backups in the bucket
 * Scaleway `ac-db-backups`. Each tenant only sees its own prefix.
 *
 * Source: s3://ac-db-backups/<tenant>/*.sql.gz, 10-day rotation on Scaleway.
 * Used by the "Backups" tab in /hub/informations.
 */

import { listS3Objects } from '~/server/utils/s3-sign'
import { resolveClientId } from '~/server/utils/db'

// Mapping clientId Nuxt (runtimeConfig) → codename tenant dans le bucket S3.
// AC est stocké sous `vaisseau-mere-ac` dans le bucket (cf convention des crons).
// Convention stricte (cf documentation/NAMING_TENANT.md) : 1 tenant = 1 codename.
// Le clientId runtime, le codename chantier, le prefix S3, le DNS et le nom
// d'env NUXT_TENANT_DB_* partagent TOUS la même chaîne.
const CLIENT_TO_BACKUP_TENANT: Record<string, string> = {
  'ac-hub':           'vaisseau-mere-ac',  // dette historique AC, à normaliser séparément
  'codemyshop':       'codemyshop',
  'example-shop':       'example-shop',
  'example-vape': 'example-vape',
}

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  if (!cfg.scwAccessKey || !cfg.scwSecretKey) {
    throw createError({
      statusCode: 503,
      message: 'Backups Scaleway non configurés sur ce tenant (SCW_* env vars manquantes)',
    })
  }

  const clientId = resolveClientId(event)
  const tenant = CLIENT_TO_BACKUP_TENANT[clientId]
  if (!tenant) {
    throw createError({
      statusCode: 404,
      message: `Pas de backup référencé pour le tenant '${clientId}'`,
    })
  }

  try {
    const objects = await listS3Objects({
      accessKey: cfg.scwAccessKey as string,
      secretKey: cfg.scwSecretKey as string,
      region:    cfg.scwRegion as string,
      endpoint:  cfg.scwEndpoint as string,
      bucket:    cfg.scwBucket as string,
    }, `${tenant}/`)

    // Tri : plus récent en premier
    objects.sort((a, b) => b.lastModified.localeCompare(a.lastModified))

    return {
      tenant,
      bucket: cfg.scwBucket,
      count: objects.length,
      objects: objects.map(o => ({
        key: o.key,
        // Extrait la date YYYY-MM-DD depuis la clé tenant/YYYY-MM-DD.sql.gz
        date: o.key.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? '',
        size: o.size,
        lastModified: o.lastModified,
      })),
    }
  } catch (err: any) {
    console.error('[hub/backups/list] error:', err.message)
    throw createError({ statusCode: 500, message: 'S3 error: ' + err.message })
  }
})
