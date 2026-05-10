/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/hub/system/info
 *
 * Inventory of open-source components + current tenant's server information.
 * Used by the 'System' tab in /hub/informations to get an overview
 * of versions to update.
 *
 * Sources :
 *   - OS / kernel / arch / hostname / uptime : node:os + /etc/os-release
 * - CPU (model, cores, load avg): node:os.cpus() + loadavg()
 * - RAM (total / free / used): node:os.totalmem() / freemem()
 * - Disk (total / free / used, rootfs): node:fs/promises.statfs('/')
 * - Node / Nuxt: process + nuxt/package.json (resolved at build)
 *   - PostgreSQL : SELECT VERSION()
 *   - pgvector : SELECT extversion FROM pg_extension WHERE extname='vector'
 * - Redis: INFO server (raw RESP over socket)
 *   - Nginx / Docker : exec(--version)
 *   - IP publique : env PUBLIC_IP / VPS_IP, fallback https://api.ipify.org (cache 1h)
 *
 * Historical note 2026-05-01 — PHP/PrestaShop removal: versions
 * PrestaShop / PHP / Symfony / MariaDB are no longer exposed (runtime
 * 100% PG/Nuxt depuis chantier #44 E.4 + php-eviction-phase3).
 *
 * No secrets exposed: only public versions + public IP (already visible via DNS).
 */

import { readFile, statfs } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createConnection } from 'node:net'
import {
  arch as osArch,
  cpus as osCpus,
  freemem,
  hostname,
  loadavg,
  release,
  totalmem,
  type as osType,
  uptime as osUptime,
} from 'node:os'
// @ts-expect-error JSON import — la version Nuxt est inlinée par le bundler Nitro au build
import nuxtPkg from 'nuxt/package.json'
import { useClientDb } from '~/server/utils/db'

const execFileP = promisify(execFile)

interface SystemInfo {
  os: { name: string; kernel: string; type: string; arch: string }
  runtime: { node: string; nuxt: string }
  stack: { postgresql: string; pgvector: string; redis: string; nginx: string; docker: string }
  server: { hostname: string; publicIp: string; uptimeSec: number }
  cpu: { model: string; cores: number; loadAvg1: number; loadAvg5: number; loadAvg15: number }
  memory: { totalBytes: number; freeBytes: number; usedBytes: number; usedPct: number }
  disk: { totalBytes: number; freeBytes: number; usedBytes: number; usedPct: number; mountpoint: string }
}

// Cache IP publique (1 heure)
let ipCache: { value: string; expiresAt: number } | null = null

async function getPublicIp(): Promise<string> {
  if (process.env.PUBLIC_IP) return process.env.PUBLIC_IP
  if (process.env.VPS_IP) return process.env.VPS_IP

  const now = Date.now()
  if (ipCache && ipCache.expiresAt > now) return ipCache.value

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 2000)
    const res = await fetch('https://api.ipify.org?format=json', { signal: ctrl.signal })
    clearTimeout(timer)
    const data = await res.json() as { ip?: string }
    const ip = data?.ip ?? ''
    if (ip) ipCache = { value: ip, expiresAt: now + 3600_000 }
    return ip
  } catch {
    return ''
  }
}

async function getOsName(): Promise<string> {
  try {
    const content = await readFile('/etc/os-release', 'utf8')
    const match = content.match(/^PRETTY_NAME="?([^"\n]+)"?/m)
    return match?.[1] ?? osType()
  } catch {
    return osType()
  }
}

function getNuxtVersion(): string {
  return (nuxtPkg as { version?: string })?.version ?? ''
}

interface DiskStats {
  totalBytes: number
  freeBytes: number
  usedBytes: number
  usedPct: number
  mountpoint: string
}

/**
 * Redis: sends raw `INFO server` on the socket and parses `redis_version`.
 * No npm dependency (ioredis/redis) — RESP protocol is simple, we
 * negotiate in a few bytes. Timeout 800ms, fail-soft → ''.
 */
async function getRedisVersion(): Promise<string> {
  const host = process.env.NUXT_REDIS_HOST || process.env.REDIS_HOST || 'localhost'
  const port = Number(process.env.NUXT_REDIS_PORT || process.env.REDIS_PORT || 6379)
  return new Promise<string>((resolve) => {
    let buf = ''
    let done = false
    const finish = (v: string) => {
      if (done) return
      done = true
      try { sock.destroy() } catch { /* ignore */ }
      resolve(v)
    }
    const sock = createConnection({ host, port }, () => {
      // Resp inline : INFO server\r\n
      sock.write('INFO server\r\n')
    })
    sock.setTimeout(800, () => finish(''))
    sock.on('error', () => finish(''))
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8')
      const m = buf.match(/redis_version:([^\r\n]+)/)
      if (m) finish(m[1].trim())
    })
    sock.on('end', () => finish(''))
  })
}

/** Nginx: `nginx -v` writes to stderr (e.g. "nginx version: nginx/1.24.0"). */
async function getNginxVersion(): Promise<string> {
  try {
    const { stderr, stdout } = await execFileP('nginx', ['-v'], { timeout: 1500 })
    const m = (stderr || stdout || '').match(/nginx\/([\d.]+)/)
    return m?.[1] ?? ''
  } catch {
    return ''
  }
}

/** Docker engine : `docker version --format {{.Server.Version}}`. */
async function getDockerVersion(): Promise<string> {
  try {
    const { stdout } = await execFileP('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: 2000 })
    return stdout.trim()
  } catch {
    return ''
  }
}

async function getDiskStats(): Promise<DiskStats> {
  const empty: DiskStats = { totalBytes: 0, freeBytes: 0, usedBytes: 0, usedPct: 0, mountpoint: '/' }
  try {
    const s = await statfs('/')
    const totalBytes = Number(s.blocks) * Number(s.bsize)
    const freeBytes = Number(s.bavail) * Number(s.bsize)
    const usedBytes = totalBytes - freeBytes
    const usedPct = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0
    return { totalBytes, freeBytes, usedBytes, usedPct, mountpoint: '/' }
  } catch {
    return empty
  }
}

/**
 * Extract PostgreSQL version from a `SELECT VERSION()` string.
 * Format typique : "PostgreSQL 16.4 (Debian 16.4-1.pgdg120+2) on x86_64..."
 * → we keep the version "16.4" without packaging noise.
 */
function parsePgVersion(raw: string): string {
  const m = raw.match(/PostgreSQL\s+([\d.]+)/i)
  return m?.[1] ?? raw
}

export default defineEventHandler(async (event): Promise<{ info: SystemInfo }> => {
  const db = useClientDb(event)

  const [osName, publicIp, diskStats, pgRows, vectorRows, redisVersion, nginxVersion, dockerVersion] = await Promise.all([
    getOsName(),
    getPublicIp(),
    getDiskStats(),
    db.query<{ v: string }>(`SELECT VERSION() AS v`).catch(() => []),
    db.query<{ v: string }>(`SELECT extversion AS v FROM pg_extension WHERE extname = 'vector'`).catch(() => []),
    getRedisVersion(),
    getNginxVersion(),
    getDockerVersion(),
  ])

  const totalMem = totalmem()
  const freeMem = freemem()
  const usedMem = totalMem - freeMem
  const cpuList = osCpus()
  const [la1, la5, la15] = loadavg()

  const info: SystemInfo = {
    os: {
      name: osName,
      kernel: release(),
      type: osType(),
      arch: osArch(),
    },
    runtime: {
      node: process.version.replace(/^v/, ''),
      nuxt: getNuxtVersion(),
    },
    stack: {
      postgresql: parsePgVersion(pgRows[0]?.v ?? ''),
      pgvector: vectorRows[0]?.v ?? '',
      redis: redisVersion,
      nginx: nginxVersion,
      docker: dockerVersion,
    },
    server: {
      hostname: hostname(),
      publicIp,
      uptimeSec: Math.floor(osUptime()),
    },
    cpu: {
      model: cpuList[0]?.model?.trim() ?? '',
      cores: cpuList.length,
      loadAvg1: Math.round(la1 * 100) / 100,
      loadAvg5: Math.round(la5 * 100) / 100,
      loadAvg15: Math.round(la15 * 100) / 100,
    },
    memory: {
      totalBytes: totalMem,
      freeBytes: freeMem,
      usedBytes: usedMem,
      usedPct: totalMem > 0 ? Math.round((usedMem / totalMem) * 1000) / 10 : 0,
    },
    disk: diskStats,
  }

  return { info }
})
