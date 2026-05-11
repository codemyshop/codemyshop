

export function skipIfNotAcInternal(taskName: string): any | null {
  if (process.env.AC_INTERNAL_CRONS === 'true') return null
  
  
  if (process.env.DEBUG_CRON_SKIPS === 'true') {
    console.log(`[cron-skip:${taskName}] AC_INTERNAL_CRONS!=true (tenant context)`)
  }
  return {
    skipped: true,
    reason:  'AC_INTERNAL_CRONS not enabled — task is AC-only',
  }
}
