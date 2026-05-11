

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { verifyToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  
  const session = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!session) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!session.isAdmin) throw createError({ statusCode: 403 })

  const query = getQuery(event)
  const clientId = (query.clientId as string || '').trim()
  const domain = (query.domain as string || '').trim()
  const action = (query.action as string || 'deploy') 

  if (!clientId) throw createError({ statusCode: 400, message: 'clientId requis' })

  
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', 
  })

  const repoRoot = resolve(process.cwd(), '..')

  
  let scriptPath: string
  let scriptArgs: string[]

  if (action === 'cleanup') {
    scriptPath = resolve(repoRoot, 'ansible/cleanup-client.sh')
    scriptArgs = [clientId]
  } else {
    scriptPath = resolve(repoRoot, 'ansible/deploy-codemyshop-local.sh')
    scriptArgs = []
    
    
  }

  const res = event.node.res

  function send(data: string, type: string = 'log') {
    res.write(`data: ${JSON.stringify({ type, text: data })}\n\n`)
  }

  send(`Lancement : ${action} ${clientId}`, 'info')

  return new Promise<void>((resolvePromise) => {
    const child = spawn('bash', [scriptPath, ...scriptArgs], {
      cwd: repoRoot,
      env: { ...process.env, TERM: 'dumb' }, 
    })

    child.stdout.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        
        const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim()
        if (clean) send(clean, clean.includes('✗') || clean.includes('ERREUR') ? 'error' : clean.includes('✓') || clean.includes('OK') ? 'success' : 'info')
      }
    })

    child.stderr.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim()
        if (clean) send(clean, 'error')
      }
    })

    child.on('close', (code) => {
      send(code === 0 ? 'Terminé avec succès' : `Terminé avec erreur (code ${code})`, code === 0 ? 'done' : 'error')
      res.write('data: [DONE]\n\n')
      res.end()
      resolvePromise()
    })

    
    res.on('close', () => {
      if (!child.killed) child.kill('SIGTERM')
      resolvePromise()
    })
  })
})
