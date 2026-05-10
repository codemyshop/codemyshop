/**
 *
 * Client helper i18n for API errors.
 *
 * Convention :
 * On the server side (Nitro), a storefront endpoint throws:
 *     throw createError({
 *       statusCode: 422,
 * statusMessage: 'Invalid SIRET (14 digits required)', // for debug logs
 *       data: { code: 'INVALID_SIRET' },                       // SCREAMING_SNAKE
 *     })
 *
 * On the client side, the caller does:
 *     const { t } = useHubT()
 *     try { await $fetch(...) }
 *     catch (err) { errorMsg.value = getApiErrorMessage(err, t) }
 *
 *   Mapping i18n : `code = 'INVALID_SIRET'` → `t('api.error_invalid_siret')`.
 * Keys live in `ps_translation` domain `HubApi` (flat key prefix `api.`).
 */

export function getApiErrorMessage(
  err: unknown,
  t: (key: string, fallback?: string) => string,
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any
  const code: string | undefined = e?.data?.code
  const debugMsg: string | undefined = e?.statusMessage || e?.data?.statusMessage
  if (code) {
    const key = `api.error_${String(code).toLowerCase()}`
    return t(key, debugMsg || t('api.error_generic', 'Une erreur est survenue.'))
  }
  return debugMsg || t('api.error_generic', 'Une erreur est survenue.')
}
