

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import Beasties from 'beasties'

const publicPath = (() => {
  const candidates = [
    resolve(process.cwd(), '.output/public'),
    resolve(process.cwd(), 'public'),
    resolve(process.cwd(), '../public'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return candidates[0]
})()

if (process.env.CSS_ASYNC_VERBOSE === 'true' || !existsSync(publicPath)) {
  console.log('[css-async] plugin loaded, publicPath =', publicPath, 'exists =', existsSync(publicPath))
}

const beasties = new Beasties({
  path: publicPath,
  publicPath: '/',
  preload: 'swap',
  noscriptFallback: true,
  pruneSource: false,
  mergeStylesheets: false,
  inlineFonts: false,
  fonts: false,
  reduceInlineStyles: false,
  compress: true,
  logLevel: process.env.CSS_ASYNC_VERBOSE === 'true' ? 'debug' : 'warn',
})

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', async (htmlContext, { event }) => {
    const url = event?.path || ''
    if (url.startsWith('/hub')) return

    
    
    const html =
      `<!doctype html><html><head>${htmlContext.head.join('')}</head>` +
      `<body>${htmlContext.bodyPrepend.join('')}${htmlContext.body.join('')}${htmlContext.bodyAppend.join('')}</body></html>`

    let processed: string
    try {
      processed = await beasties.process(html)
    } catch (err) {
      console.error('[css-async] beasties.process failed:', (err as Error).message)
      return
    }

    
    const headMatch = processed.match(/<head>([\s\S]*?)<\/head>/)
    if (headMatch) {
      htmlContext.head = [headMatch[1]]
    }
    
    
    
  })
})
