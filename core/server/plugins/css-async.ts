/**
 *
 * Plugin Nitro — Critical CSS inline + async load.
 *
 * Incident 2026-05-06: Phase D v1 (preload+onload without inline) caused
 * CLS to spike from 0.031 to 1.126. The browser rendered unstyled HTML
 * for 1-2 s then everything shifted when the CSS arrived. Score 39 vs 54.
 *
 * Phase D v2 (this implementation): extract via `beasties` the rules
 * actually used in the rendered HTML, inline them in `<style>` in
 * the `<head>`, and async-load the complete CSS. Above-the-fold is
 * styled immediately → CLS stays low, FCP/LCP improve.
 *
 * Incident 2026-05-04 (`features.inlineStyles:true` broke prod)
 * respected: do NOT touch the Nuxt config, only intervene on
 * the finalized SSR HTML.
 *
 * Routes /hub/** exclues (back-office SPA, ssr:false).
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import Beasties from 'beasties'

// PM2 wrap : `process.argv[1]` pointe vers le launcher PM2, pas vers
// .output/server/index.mjs (incidents 2026-05-06). On essaie plusieurs
// chemins probables et on garde le premier qui existe.
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

    // Reconstruct the full HTML document for beasties to analyze.
    // beasties has to see body markup to detect which selectors are used.
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

    // Re-extract head section from beasties output (body intact).
    const headMatch = processed.match(/<head>([\s\S]*?)<\/head>/)
    if (headMatch) {
      htmlContext.head = [headMatch[1]]
    }
    // Body content / bodyPrepend / bodyAppend laissés intacts : beasties
    // ne touche pas les attributs body et le contenu visible reste celui
    // rendu par Vue/Nuxt. On ne réécrit que la <head>.
  })
})
