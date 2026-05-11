

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
  } catch {  }

  return {
    status: 'ok',
    buildId,
    uptime: Math.floor(process.uptime()),
    ts: new Date().toISOString(),
  }
})
