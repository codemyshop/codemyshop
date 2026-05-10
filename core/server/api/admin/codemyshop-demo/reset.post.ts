/**
 *
 * POST /api/admin/codemyshop-demo/reset
 * Manual reset of the demo database via the synedre/codemyshop-demo-reset.sh script.
 * Reserved for administrators of the codemyshop-demo tenant. Issue #80.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import { verifyToken } from '~/server/utils/session-crypto'

const execFileP = promisify(execFile)

export default defineEventHandler(async (event) => {
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403, message: 'Accès admin requis' })

  const cfg = useRuntimeConfig()
  if (!(cfg.public as any)?.isDemo) {
    throw createError({ statusCode: 403, message: 'Endpoint réservé au tenant démo' })
  }

  const script = resolve(process.cwd(), '..', 'synedre/codemyshop-demo-reset.sh')
  const startedAt = Date.now()

  try {
    const { stdout, stderr } = await execFileP('bash', [script], {
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    })
    return {
      success: true,
      durationMs: Date.now() - startedAt,
      stdout: stdout.trim().split('\n').slice(-5),
      stderr: stderr.trim() ? stderr.trim().split('\n').slice(-5) : [],
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: `Reset échoué : ${err?.message?.slice(0, 200) || 'erreur inconnue'}`,
    })
  }
})
