/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Middleware : Bot Tracker
 * Tracks each bot visit (Googlebot, GPTBot, ClaudeBot, etc.)
 * Stores in cs_bot_hits DB for the /hub/seo-monitor dashboard.
 */

const BOT_SIGNATURES: Record<string, string> = {
  googlebot: 'Google',
  'google-inspectiontool': 'Google Inspect',
  'adsbot-google': 'Google Ads',
  'mediapartners-google': 'Google AdSense',
  bingbot: 'Bing',
  slurp: 'Yahoo',
  duckduckbot: 'DuckDuckGo',
  baiduspider: 'Baidu',
  yandexbot: 'Yandex',
  facebookexternalhit: 'Facebook',
  twitterbot: 'Twitter',
  linkedinbot: 'LinkedIn',
  applebot: 'Apple',
  gptbot: 'GPTBot',
  chatgpt: 'ChatGPT',
  claudebot: 'ClaudeBot',
  anthropic: 'Anthropic',
  amazonbot: 'Amazon',
  semrushbot: 'Semrush',
  ahrefsbot: 'Ahrefs',
  mj12bot: 'Majestic',
  dotbot: 'Moz',
  rogerbot: 'Moz',
  petalbot: 'Huawei',
  bytespider: 'ByteDance',
  'screaming frog': 'Screaming Frog',
}

interface BotHit {
  bot: string
  url: string
  status: number
  ip: string
}

// Buffer en mémoire — flush en DB toutes les 30 secondes
// Taille bornée pour éviter tout memory leak si la DB est indisponible.
const MAX_BUFFER = 500
let buffer: BotHit[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

// Circuit breaker : si la table cs_bot_hits n'existe pas sur le tenant,
// on désactive proprement le tracking (log unique, pas de retry infini).
// Cas d'usage : module ac_telemetry pas encore installé sur une DB client.
let disabled = false

function detectBot(ua: string): string | null {
  if (!ua) return null
  const lower = ua.toLowerCase()
  for (const [sig, name] of Object.entries(BOT_SIGNATURES)) {
    if (lower.includes(sig)) return name
  }
  return null
}

function stopTracking(reason: string) {
  disabled = true
  buffer = []
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  console.warn(`[bot-tracker] disabled — ${reason}`)
}

async function flushBuffer() {
  if (disabled || buffer.length === 0) return
  const toFlush = buffer.slice(0, MAX_BUFFER)
  buffer = buffer.slice(toFlush.length)

  try {
    const { insertBotHits, purgeOldBotHits } = await import('~/enterprise/data/telemetry/server/utils/telemetry')
    await insertBotHits(toFlush, {})
    await purgeOldBotHits(30, {})
  } catch (err: any) {
    // Table manquante → désactiver proprement (module ac_telemetry non installé)
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      stopTracking(`table cs_bot_hits missing (install module ac_telemetry)`)
      return
    }
    // Erreur transitoire : log court (sans le payload bruyant) et drop le batch
    console.error(`[bot-tracker] flush error (${toFlush.length} hits dropped):`, err?.code || err?.message || 'unknown')
  }
}

export default defineEventHandler((event) => {
  if (disabled) return

  const ua = getRequestHeader(event, 'user-agent') || ''
  const bot = detectBot(ua)
  if (!bot) return // Pas un bot, on passe

  const url = getRequestURL(event).pathname
  const ip = getRequestHeader(event, 'x-real-ip')
    || getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || ''

  // Ne pas tracker les assets statiques
  if (url.startsWith('/_nuxt/') || url.startsWith('/img/') || url.includes('.')) return

  // Capturer le vrai status HTTP après la réponse
  event.node.res.on('finish', () => {
    if (disabled || buffer.length >= MAX_BUFFER) return
    buffer.push({
      bot,
      url,
      status: event.node.res.statusCode,
      ip,
    })
  })

  // Démarrer le flush timer au premier hit
  if (!flushTimer) {
    flushTimer = setInterval(flushBuffer, 30000)
    process.on('beforeExit', flushBuffer)
  }
})
