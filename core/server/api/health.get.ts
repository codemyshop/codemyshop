/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/health
 * Lightweight endpoint for deploy health check.
 * Returns the build UUID without DB call, without SSR, without external dependencies.
 * The deploy-nuxt.sh checks this endpoint instead of the homepage.
 */
export default defineEventHandler(async () => {
  let buildId = ''
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const latestPath = path.join(process.cwd(), '.output', 'public', '_nuxt', 'builds', 'latest.json')
    if (fs.existsSync(latestPath)) {
      const raw = fs.readFileSync(latestPath, 'utf8')
      const match = raw.match(/[a-f0-9-]{36}/)
      if (match) buildId = match[0]
    }
  } catch { /* ignore */ }

  return {
    status: 'ok',
    buildId,
    uptime: Math.floor(process.uptime()),
    ts: new Date().toISOString(),
  }
})
