/**
 *
 * Nitro Task — audit:synedre-watch
 *
 * Wave 1B.3 of task #43 (python-nitro-tasks). Port of
 * `synedre/ac_synedre_watch.py` (cron samedi 07:45 UTC). Veille
 * competitive: monitors 5 multi-agent frameworks (LangGraph, AutoGen,
 * CrewAI, MetaGPT, Claude Agent SDK) via GitHub API + PyPI, and flags
 * alignments with the framework's core pillars (constitution, incidents,
 * task execution, role profiles, cross-validation, calendar).
 *
 * Stockage DB-only :
 *   - Snapshot quotidien : INSERT cs_audit_reports (report_type='synedre_watch')
 */

import { defineTask } from 'nitropack/runtime'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'

const PG_SCHEMA  = 'cs_main'
const USER_AGENT = 'ac-synedre-watch/2.0 (Nitro Task)'
const FETCH_TIMEOUT_MS = 15_000

interface Target {
  id: string
  name: string
  owner: string
  repo: string
  pypi: string | null
  keywords: string[]
}

const TARGETS: readonly Target[] = [
  { id: 'langgraph', name: 'LangGraph',         owner: 'langchain-ai', repo: 'langgraph',  pypi: 'langgraph',
    keywords: ['memory', 'persistence', 'checkpoint', 'human-in-the-loop', 'multi-agent'] },
  { id: 'autogen',   name: 'AutoGen',           owner: 'microsoft',    repo: 'autogen',    pypi: 'autogen-agentchat',
    keywords: ['memory', 'learning', 'reflection', 'multi-agent', 'orchestration'] },
  { id: 'crewai',    name: 'CrewAI',            owner: 'crewAIInc',    repo: 'crewAI',     pypi: 'crewai',
    keywords: ['memory', 'training', 'quality', 'delegation', 'crew'] },
  { id: 'metagpt',   name: 'MetaGPT',           owner: 'geekan',       repo: 'MetaGPT',    pypi: 'metagpt',
    keywords: ['role', 'sop', 'review', 'quality', 'multi-agent'] },
  { id: 'claude-agent-sdk', name: 'Claude Agent SDK', owner: 'anthropics', repo: 'claude-code', pypi: null,
    keywords: ['agent', 'orchestration', 'tool', 'subagent', 'hooks'] },
] as const

interface Pillar {
  id: string
  label: string
  description: string
  keywords: string[]
}

const PILLARS: readonly Pillar[] = [
  { id: 'constitution', label: 'Constitution / Doctrine',
    description: 'Règles non-négociables, avis bloquants, hiérarchie agents',
    keywords: ['constitution', 'governance', 'blocking', 'authority', 'rules', 'policy', 'doctrine'] },
  { id: 'incidents', label: 'Cicatrices / Apprentissage erreurs',
    description: 'Mémoire des erreurs gravée dans les profils, checks permanents',
    keywords: ['learning from error', 'scar', 'mistake', 'feedback loop', 'self-improvement', 'post-mortem', 'retrospective'] },
  { id: 'drill', label: 'Drill / Stress-tests agents',
    description: 'Entraînement automatisé, scores fitness, scénarios piégés',
    keywords: ['stress test', 'evaluation', 'benchmark', 'fitness', 'training', 'drill', 'assessment', 'scoring'] },
  { id: 'profils_metier', label: 'Profils métier détaillés',
    description: '200-400 lignes par agent, checks spécifiques, expertise réelle',
    keywords: ['role profile', 'expertise', 'specialist', 'domain expert', 'detailed profile', 'agent spec'] },
  { id: 'validation_croisee', label: 'Validation croisée post-livrable',
    description: 'Jusqu\'à 10 agents vérifient chaque commit/livrable',
    keywords: ['cross validation', 'review', 'quality gate', 'post-commit', 'multi-review', 'peer review'] },
  { id: 'calendrier', label: 'Calendrier de dispatch',
    description: 'Qui fait quoi quel jour, discipline organisationnelle',
    keywords: ['schedule', 'calendar', 'dispatch', 'planning', 'time management', 'workflow schedule'] },
] as const

type Severity = 'ROUGE' | 'ORANGE' | 'JAUNE'

interface Signal {
  target: string
  pillar: string
  pillar_id: string
  severity: Severity
  matches: string[]
  description: string
}

interface TargetSnapshot {
  name: string
  stars: number
  latest_release: string
  pypi_version: string | null
  commits_7d: number
  signals: number
}

// ── Guard schema ───────────────────────────────────────────────────────────

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

// ── HTTP helpers ───────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) },
    })
  } finally {
    clearTimeout(timer)
  }
}

async function githubApi<T>(path: string): Promise<T | null> {
  const token = process.env.GITHUB_TOKEN ?? ''
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  }
  if (token) headers.Authorization = `token ${token}`
  try {
    const res = await fetchWithTimeout(`https://api.github.com/${path}`, { headers })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

interface GhRelease { tag_name: string; published_at: string | null; body: string }
interface GhTag     { name: string }
interface GhCommit  { commit?: { message?: string } }
interface GhRepo    { stargazers_count?: number }

async function getLatestRelease(owner: string, repo: string): Promise<{ tag: string; body: string } | null> {
  const rel = await githubApi<GhRelease>(`repos/${owner}/${repo}/releases/latest`)
  if (rel?.tag_name) return { tag: rel.tag_name, body: rel.body ?? '' }
  const tags = await githubApi<GhTag[]>(`repos/${owner}/${repo}/tags`)
  if (Array.isArray(tags) && tags.length > 0) return { tag: tags[0].name, body: '' }
  return null
}

async function getRecentCommits(owner: string, repo: string, days = 7): Promise<GhCommit[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const data = await githubApi<GhCommit[]>(`repos/${owner}/${repo}/commits?since=${encodeURIComponent(since)}&per_page=30`)
  return Array.isArray(data) ? data : []
}

async function getRepoStars(owner: string, repo: string): Promise<number> {
  const r = await githubApi<GhRepo>(`repos/${owner}/${repo}`)
  return r?.stargazers_count ?? 0
}

interface PypiResp { info?: { version?: string } }

async function getPypiVersion(pkg: string | null): Promise<string | null> {
  if (!pkg) return null
  try {
    const res = await fetchWithTimeout(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`,
      { timeoutMs: 10_000 })
    if (!res.ok) return null
    const data = (await res.json()) as PypiResp
    return data.info?.version ?? null
  } catch {
    return null
  }
}

// ── Analyse menace ─────────────────────────────────────────────────────────

function analyzeThreat(target: Target, releaseBody: string, commits: GhCommit[]): Signal[] {
  let textPool = (releaseBody ?? '').toLowerCase()
  for (const c of commits.slice(0, 20)) {
    textPool += ' ' + (c.commit?.message ?? '').toLowerCase()
  }
  const trimmed = textPool.trim()
  if (!trimmed) return []

  const out: Signal[] = []
  for (const pillar of PILLARS) {
    const matches = pillar.keywords.filter((kw) => textPool.includes(kw.toLowerCase()))
    if (matches.length === 0) continue
    const severity: Severity = matches.length >= 3 ? 'ROUGE' : matches.length >= 2 ? 'ORANGE' : 'JAUNE'
    out.push({
      target: target.name,
      pillar: pillar.label,
      pillar_id: pillar.id,
      severity,
      matches,
      description: `${target.name} montre des signes d'évolution vers : ${pillar.label}`,
    })
  }
  return out
}

// ── Audit principal ────────────────────────────────────────────────────────

async function runAudit(log: AutomateLog): Promise<{
  targets: Record<string, TargetSnapshot>
  signals: Signal[]
  summary: string
}> {
  const targets: Record<string, TargetSnapshot> = {}
  const signals: Signal[] = []

  for (const t of TARGETS) {
    const ts = Date.now()
    const [stars, release, commits] = await Promise.all([
      getRepoStars(t.owner, t.repo),
      getLatestRelease(t.owner, t.repo),
      getRecentCommits(t.owner, t.repo, 7),
    ])
    const pypi = await getPypiVersion(t.pypi)
    const tagName = release?.tag ?? '?'
    const body    = release?.body ?? ''
    const tSignals = analyzeThreat(t, body, commits)
    signals.push(...tSignals)
    targets[t.id] = {
      name: t.name,
      stars,
      latest_release: tagName,
      pypi_version: pypi,
      commits_7d: commits.length,
      signals: tSignals.length,
    }
    log.step(`check_${t.id}`, 'ok',
      `⭐${stars} ${tagName} ${commits.length}c/7j ${tSignals.length}sig`,
      Date.now() - ts)
  }

  const rouge  = signals.filter((s) => s.severity === 'ROUGE').length
  const orange = signals.filter((s) => s.severity === 'ORANGE').length
  const jaune  = signals.filter((s) => s.severity === 'JAUNE').length

  let summary: string
  if (rouge)       summary = `${rouge} signal(s) ROUGE — concurrent rapproché d'un pilier Synedre`
  else if (orange) summary = `${orange} signal(s) orange — évolutions à surveiller`
  else if (jaune)  summary = `${jaune} signal(s) jaune — mouvements détectés`
  else             summary = 'Aucun signal — l\'avance Synedre est intacte'

  log.count('signals_rouge', rouge)
  log.count('signals_orange', orange)
  log.count('signals_jaune', jaune)

  return { targets, signals, summary }
}

// ── Persistance DB-only ────────────────────────────────────────────────────

async function persistReport(
  targets: Record<string, TargetSnapshot>,
  signals: Signal[],
  summary: string,
): Promise<void> {
  const sql = getPgClient()
  const dataJson = JSON.stringify({
    date: new Date().toISOString(),
    targets,
    signals,
    counts: {
      rouge:  signals.filter((s) => s.severity === 'ROUGE').length,
      orange: signals.filter((s) => s.severity === 'ORANGE').length,
      jaune:  signals.filter((s) => s.severity === 'JAUNE').length,
    },
  })

  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'synedre_watch' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES
      ('synedre_watch', CURRENT_DATE, ${dataJson}, ${summary.slice(0, 500)}, NOW())
  `
}

// ── Nitro Task entrypoint ──────────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:synedre-watch',
    description: 'Veille compétitive frameworks multi-agents (port ac_synedre_watch, Wave 1B.3)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:synedre-watch')
    if (skip) return { result: skip }
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock('ac_synedre_watch', async () => {
      return runAutomate('ac_synedre_watch', async (log) => {
        const { targets, signals, summary } = await runAudit(log)
        log.count('targets_scanned', Object.keys(targets).length)
        log.count('signals_total', signals.length)

        await persistReport(targets, signals, summary)

        const rouge = signals.filter((s) => s.severity === 'ROUGE').length
        log.setResult(rouge > 0 ? 'partial' : 'ok', summary)
        return { status: rouge > 0 ? 'partial' : 'ok', signals: signals.length, targets }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
