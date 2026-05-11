

export function getApiErrorMessage(
  err: unknown,
  t: (key: string, fallback?: string) => string,
): string {
  
  const e = err as any
  const code: string | undefined = e?.data?.code
  const debugMsg: string | undefined = e?.statusMessage || e?.data?.statusMessage
  if (code) {
    const key = `api.error_${String(code).toLowerCase()}`
    return t(key, debugMsg || t('api.error_generic', 'Une erreur est survenue.'))
  }
  return debugMsg || t('api.error_generic', 'Une erreur est survenue.')
}
