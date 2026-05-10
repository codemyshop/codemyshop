/**
 *
 * Nitro Task — audit:factcheck
 *
 * Wave 1 active #3 of work #43. Port of `ac_factcheck.py`
 * (cron quotidien 07:30 UTC, 670 lignes Python).
 *
 * Anti-hallucination : for each published article, detects
 * 1. agent_name        — "the agent X (Y)" where Y does not exist in
 *                          cs_agents (nickname/codename).
 * 2. agent_role         — Y exists but the announced role doesn't match
 * the agent's actual role.
 * 3. agent_count        — "N AI agents" where N > count + 10.
 * 4. business_fact      — called SaaS (should be PaaS) or
 *                          "TJM XXX €" ≠ 950.
 *   5. internal_url       — href="/xxx" hors whitelist routes.
 * 6. mentor_agent_conflict — a mentor shares a nickname
 *                          d'agent (sauf Socrate, exception explicite).
 * 7. cannibalization    — Jaccard ≥ 70% between the article and another
 *                          article actif (bloquant SEO).
 *
 * Execution mode controlled by AUDIT_MODE:
 * - 'shadow' (default) : full scan, report persisted, ZERO writes.
 * The current cron runs without --fix so
 * the shadow Nitro doesn't change the behavior
 *                          (cohabitation safe).
 *   - 'active'           : applique l'auto-fix natif DB (UPDATE
 * ps_cms_lang.content) for the agent_names
 * incorrectly named when we can guess the correct one.
 *
 * Stockage DB-only : INSERT idempotent cs_audit_reports
 * (report_type='factcheck', 1 row/jour).
 */

import { defineTask } from 'nitropack/runtime'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { getAuditMode, type AuditMode } from '~/server/utils/audit-mode'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_factcheck'
const CANNIBALIZATION_THRESHOLD = 0.70
const TJM_REFERENCE = '950'

// Routes statiques connues — toute autre URL interne référencée est warn.
const KNOWN_ROUTES: ReadonlySet<string> = new Set([
  '/', '/blog', '/outils-ia', '/modules', '/flywheel', '/equipe',
  '/agents-ia', '/reacteur', '/synedre/constitution', '/drill',
  '/academy', '/offre-premium', '/offre-starter', '/contact',
  '/confidentialite', '/mentions-legales', '/conditions-generales-de-vente',
  '/dictionnaire', '/crm', '/synedre',
])

// Préfixes ignorés (URLs dynamiques non vérifiables).
const DYNAMIC_PREFIXES: readonly string[] = [
  '/blog/', '/dictionnaire/', '/academy/', '/outils/', '/expertise',
]

// Mots après "l'agent " qui ne sont pas un nom d'agent.
const AGENT_GENERIC_WORDS: ReadonlySet<string> = new Set([
  'fait', 'est', 'ne', 'a', 'y', 's', 'se', 'qui', 'et', 'ou', 'du', 'de',
  'responsable', 'fautif', 'concerné', 'concernée', 'principal', 'principale',
  'vérifie', 'détecte', 'reçoit', 'applique', 'envoie', 'réussit', 'obéit',
  'lit', 'dépasse', 'trompe', 'exécute', 'décide', 'propose', 'interprète',
  'note', 'traite', 'unique', 'spécialisé', 'spécialiste', 'généraliste',
  'ia', 'dans', 'pour', 'avec', 'sur', 'par', 'à', 'le', 'la', 'les',
])

const KNOWN_ROLES: ReadonlySet<string> = new Set([
  'seo', 'commercial', 'juridique', 'design', 'data', 'brand',
  'copywriting', 'qa', 'vision', 'santé', 'stratégie', 'infra',
  'backend', 'frontend', 'content', 'dialogue', 'veille',
  'sécurité', 'accessibilité', 'dg', 'client', 'motivation', 'da',
])

// Exceptions mentor==agent (légitimes).
const MENTOR_EXCEPTIONS: ReadonlySet<string> = new Set(['socrate'])

// Aliases rôle court → rôles agents.json (parité Python ligne 190-208).
const ROLE_ALIASES: Record<string, readonly string[]> = {
  'stratégie':   ['stratégie', 'strategy', 'officier stratégie'],
  'strategy':    ['stratégie', 'strategy', 'officier stratégie'],
  'dg':          ['directeur général', 'dg', 'business'],
  'juridique':   ['juridique', 'conseiller juridique', 'droit'],
  'seo':         ['seo', 'seo technical', 'référencement'],
  'commercial':  ['commercial', 'head of commercial', 'growth'],
  'design':      ['directeur artistique', 'design', 'identité visuelle'],
  'copywriting': ['copywriter', 'copywriting', 'ton', 'persuasion'],
  'qa':          ['qa', 'quality assurance'],
  'vision':      ['vision', 'chief vision', 'mindset', 'north star'],
  'santé':       ['santé', 'santé mentale', 'gardien'],
  'brand':       ['brand', 'brand guardian', 'simplification'],
  'data':        ['data', 'data analyst', 'métriques'],
  'content':     ['content', 'content manager', 'blog'],
  'infra':       ['devops', 'infrastructure', 'infra'],
  'dialogue':    ['dialogue', 'communauté', 'maïeutique'],
  'sécurité':    ['sécurité', 'offensive', 'défensive'],
}

// Stop words FR pour la similarité Jaccard.
const STOP_WORDS_FR: ReadonlySet<string> = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'à', 'au',
  'aux', 'pour', 'par', 'sur', 'dans', 'avec', 'est', 'sont', 'qui', 'que',
  'ce', 'ces', 'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
  'ne', 'pas', 'plus', 'se', 'il', 'elle', 'on', 'nous', 'vous', 'ils',
  'elles', 'je', 'tu', 'être', 'avoir', 'faire', 'dire', 'aller', 'voir',
  'tout', 'tous', 'toute', 'toutes', 'comme', 'mais', 'ou', 'car', 'donc',
  'ni', 'si', 'très', 'bien', 'aussi', 'cette', 'entre', 'sans', 'vers',
  'chez', 'quand', 'comment', 'pourquoi', 'votre', 'notre', 'leur', 'leurs',
  'peut', 'vos', 'nos', 'dont', 'quoi', 'même', 'autre', 'autres',
])

// ── Patterns ────────────────────────────────────────────────────────────

const AGENT_REF_RE = /[Ll]'agent\s+([\wÀ-ÿ][\wÀ-ÿ\s]*?)\s*\(([\wÀ-ÿ][\wÀ-ÿ\s']*?)\)/g
const AGENT_SIMPLE_RE = /[Ll]'agent\s+([\wÀ-ÿ]+)/g
const AGENT_COUNT_RE = /(\d+)\s+agents?\s+(?:IA|spécialisés|spécialistes)/g
const INTERNAL_URL_RE = /href="(\/[a-z][a-z0-9/\-]*)"/g
const SAAS_RE = /CodeMyShop[^.]*?\bSaaS\b/gi
const TJM_RE = /TJM[^0-9]*?(\d[\d\s]*)\s*€/g

// ── Types ───────────────────────────────────────────────────────────────

type Severity = 'BLOQUANT' | 'WARNING'
type IssueType =
  | 'agent_name' | 'agent_role' | 'agent_count'
  | 'business_fact' | 'internal_url'
  | 'mentor_agent_conflict' | 'cannibalization'

interface Issue {
  type: IssueType
  severity: Severity
  detail: string
  context: string
  suggestion?: string
}

interface Agent {
  codename: string
  nickname: string
  role: string
}

interface AgentMaps {
  byNickname: Map<string, Agent>
  byCodename: Map<string, Agent>
  count: number
  raw: Agent[]
}

interface ArticleRow {
  id: number
  title: string
  content: string
  link_rewrite: string
}

// ── Guard schema ────────────────────────────────────────────────────────

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

// ── Loaders DB ──────────────────────────────────────────────────────────

async function loadAgents(): Promise<AgentMaps> {
  const sql = getPgClient()
  const rows = await sql<{ codename: string | null; nickname: string | null; role: string | null }[]>`
    SELECT codename, nickname, role
    FROM ${sql(PG_SCHEMA)}.cs_agents
  `
  const agents: Agent[] = rows.map((r) => ({
    codename: (r.codename ?? '').trim(),
    nickname: (r.nickname ?? '').trim(),
    role:     (r.role     ?? '').trim(),
  }))
  const byNickname = new Map<string, Agent>()
  const byCodename = new Map<string, Agent>()
  for (const a of agents) {
    if (a.nickname) byNickname.set(a.nickname.toLowerCase(), a)
    if (a.codename) byCodename.set(a.codename.toLowerCase(), a)
  }
  return { byNickname, byCodename, count: agents.length, raw: agents }
}

async function loadAcademyMentors(): Promise<{ slug: string; mentor: string }[]> {
  const sql = getPgClient()
  const rows = await sql<{ slug: string | null; mentor: string | null }[]>`
    SELECT slug, mentor FROM ${sql(PG_SCHEMA)}.cs_academy_module
  `
  return rows
    .map((r) => ({ slug: (r.slug ?? '').trim(), mentor: (r.mentor ?? '').trim() }))
    .filter((m) => m.slug && m.mentor)
}

async function loadActiveArticles(): Promise<ArticleRow[]> {
  const sql = getPgClient()
  const rows = await sql<{
    id_cms: number
    meta_title: string | null
    content: string | null
    link_rewrite: string | null
  }[]>`
    SELECT cl.id_cms, cl.meta_title, cl.content, cl.link_rewrite
    FROM ${sql(PG_SCHEMA)}.ps_cms_lang cl
    JOIN ${sql(PG_SCHEMA)}.ps_cms c ON c.id_cms = cl.id_cms
    WHERE cl.id_lang = 1 AND c.active = 1
    ORDER BY cl.id_cms
  `
  return rows.map((r) => ({
    id: Number(r.id_cms),
    title: r.meta_title ?? '',
    content: r.content ?? '',
    link_rewrite: r.link_rewrite ?? '',
  }))
}

// ── Auto-fix natif DB ───────────────────────────────────────────────────

async function applyContentFixProd(idCms: number, newContent: string): Promise<boolean> {
  const sql = getPgClient()
  try {
    await sql`
      UPDATE ${sql(PG_SCHEMA)}.ps_cms_lang
      SET content = ${newContent}
      WHERE id_cms = ${idCms} AND id_lang = 1
    `
    return true
  } catch { return false }
}

// ── Helpers similarity ──────────────────────────────────────────────────

function extractKeywords(text: string): Set<string> {
  const stripped = text.replace(/<[^>]+>/g, ' ')
  const normalized = stripped.toLowerCase().replace(/[^a-zà-ÿ0-9\s-]/g, ' ')
  const words = normalized.split(/\s+/)
  const out = new Set<string>()
  for (const w of words) {
    if (w.length >= 3 && !STOP_WORDS_FR.has(w)) out.add(w)
  }
  return out
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

function suggestAgent(name: string, agents: AgentMaps): string {
  const target = name.toLowerCase()
  let best: Agent | null = null
  let bestScore = 0
  for (const [nick, data] of agents.byNickname) {
    let common = 0
    for (const c of target) if (nick.includes(c)) common++
    const score = common / Math.max(target.length, nick.length)
    if (score > bestScore) {
      bestScore = score
      best = data
    }
  }
  if (best && bestScore > 0.3) {
    return `Peut-être « ${best.nickname} » (${best.role.slice(0, 40)}) ?`
  }
  return ''
}

// ── Checks ──────────────────────────────────────────────────────────────

function checkRoleMatch(roleLabel: string, agent: Agent, ctx: string, out: Issue[]): void {
  const roleReal = agent.role.toLowerCase()
  const roleGiven = roleLabel.toLowerCase().trim()
  for (const aliases of Object.values(ROLE_ALIASES)) {
    const hit = aliases.some((a) => roleGiven === a || roleGiven.includes(a))
    if (!hit) continue
    const realHit = aliases.some((a) => roleReal.includes(a))
    if (!realHit) {
      out.push({
        type: 'agent_role', severity: 'BLOQUANT',
        detail: `Agent ${agent.nickname} est « ${agent.role.slice(0, 50)} », pas « ${roleLabel} »`,
        context: ctx,
      })
    }
    return
  }
  if (!roleReal.includes(roleGiven)) {
    const words = roleGiven.split(/\s+/).filter((w) => w.length > 3)
    if (!words.some((w) => roleReal.includes(w))) {
      out.push({
        type: 'agent_role', severity: 'WARNING',
        detail: `Rôle « ${roleLabel} » pour ${agent.nickname} — rôle réel : « ${agent.role.slice(0, 50)} »`,
        context: ctx,
      })
    }
  }
}

function checkAgentNames(html: string, agents: AgentMaps): Issue[] {
  const out: Issue[] = []

  // Pattern "l'agent Rôle (Nickname)"
  for (const m of html.matchAll(AGENT_REF_RE)) {
    const roleLabel = m[1].trim()
    const nickname  = m[2].trim()
    const ctx       = m[0]
    const nLower    = nickname.toLowerCase()
    if (!agents.byNickname.has(nLower)) {
      if (!agents.byCodename.has(nLower)) {
        out.push({
          type: 'agent_name', severity: 'BLOQUANT',
          detail: `Agent « ${nickname} » n'existe pas dans cs_agents`,
          context: ctx,
          suggestion: suggestAgent(nickname, agents),
        })
      } else {
        const real = agents.byCodename.get(nLower)!
        out.push({
          type: 'agent_name', severity: 'WARNING',
          detail: `« ${nickname} » est un codename, pas un nickname. Nickname = ${real.nickname}`,
          context: ctx,
        })
      }
    } else {
      const agent = agents.byNickname.get(nLower)!
      checkRoleMatch(roleLabel, agent, ctx, out)
    }
  }

  // Pattern "l'agent Nickname" (sans parenthèses)
  for (const m of html.matchAll(AGENT_SIMPLE_RE)) {
    const name = m[1].trim()
    const lower = name.toLowerCase()
    if (AGENT_GENERIC_WORDS.has(lower)) continue
    if (agents.byNickname.has(lower) || agents.byCodename.has(lower)) continue
    if (KNOWN_ROLES.has(lower)) continue
    out.push({
      type: 'agent_name', severity: 'WARNING',
      detail: `Référence « l'agent ${name} » — nom inconnu`,
      context: m[0],
      suggestion: suggestAgent(name, agents),
    })
  }
  return out
}

function checkAgentCount(html: string, agents: AgentMaps): Issue[] {
  const out: Issue[] = []
  for (const m of html.matchAll(AGENT_COUNT_RE)) {
    const mentioned = parseInt(m[1], 10)
    if (mentioned > agents.count + 10) {
      out.push({
        type: 'agent_count', severity: 'WARNING',
        detail: `Mentionne ${mentioned} agents, il y en a ${agents.count} en DB`,
        context: m[0],
      })
    }
  }
  return out
}

function checkBusinessFacts(html: string): Issue[] {
  const out: Issue[] = []
  for (const m of html.matchAll(SAAS_RE)) {
    out.push({
      type: 'business_fact', severity: 'BLOQUANT',
      detail: 'CodeMyShop est un PaaS, pas un SaaS',
      context: m[0].slice(0, 80),
    })
  }
  for (const m of html.matchAll(TJM_RE)) {
    const tjm = m[1].replace(/\s/g, '')
    if (tjm !== TJM_REFERENCE) {
      out.push({
        type: 'business_fact', severity: 'BLOQUANT',
        detail: `TJM mentionné = ${tjm}€, réel = ${TJM_REFERENCE}€`,
        context: m[0],
      })
    }
  }
  return out
}

function checkInternalUrls(html: string): Issue[] {
  const out: Issue[] = []
  for (const m of html.matchAll(INTERNAL_URL_RE)) {
    const url = m[1]
    if (DYNAMIC_PREFIXES.some((p) => url.startsWith(p))) continue
    if (KNOWN_ROUTES.has(url)) continue
    out.push({
      type: 'internal_url', severity: 'WARNING',
      detail: `URL interne « ${url} » — vérifier qu'elle existe`,
      context: m[0],
    })
  }
  return out
}

function checkMentorAgentConflict(
  agents: AgentMaps, mentors: { slug: string; mentor: string }[],
): Issue[] {
  const out: Issue[] = []
  const agentNames = new Set<string>([
    ...agents.byNickname.keys(),
    ...agents.byCodename.keys(),
  ])
  for (const m of mentors) {
    const lower = m.mentor.toLowerCase()
    if (!agentNames.has(lower)) continue
    if (MENTOR_EXCEPTIONS.has(lower)) continue
    out.push({
      type: 'mentor_agent_conflict', severity: 'BLOQUANT',
      detail: `Module '${m.slug}' : mentor '${m.mentor}' est aussi un agent — interdit`,
      context: `mentor=${m.mentor} in ${m.slug}`,
    })
  }
  return out
}

function checkCannibalization(
  article: ArticleRow,
  others: { id: number; title: string; kw: Set<string>; slug: string }[],
): Issue[] {
  const out: Issue[] = []
  const baseText = `${article.title} ${article.content.slice(0, 2000)}`
  const baseKw   = extractKeywords(baseText)
  if (baseKw.size < 5) return out
  for (const o of others) {
    if (o.id === article.id) continue
    const sim = jaccardSimilarity(baseKw, o.kw)
    if (sim < CANNIBALIZATION_THRESHOLD) continue
    const inter: string[] = []
    for (const k of baseKw) if (o.kw.has(k)) inter.push(k)
    out.push({
      type: 'cannibalization', severity: 'BLOQUANT',
      detail:
        `Cannibalisation SEO ${(sim * 100).toFixed(0)}% avec ` +
        `« ${o.title.slice(0, 60)} » (${o.slug.slice(0, 40)})`,
      context: `Mots communs: ${inter.sort().slice(0, 8).join(', ')}…`,
    })
  }
  return out
}

// ── Auto-fix : agent_name BLOQUANT corrigeable ──────────────────────────

interface ContentFix {
  old_substring: string
  new_substring: string
  reason: string
}

function tryFixAgentNames(html: string, agents: AgentMaps): { html: string; fixes: ContentFix[] } {
  const fixes: ContentFix[] = []
  let out = html
  for (const m of html.matchAll(AGENT_REF_RE)) {
    const roleLabel = m[1].trim()
    const nickname  = m[2].trim()
    if (agents.byNickname.has(nickname.toLowerCase())) continue
    // Chercher un agent dont le rôle réel contient un mot >3 du roleLabel.
    const roleWords = roleLabel.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    let candidate: Agent | null = null
    for (const a of agents.byNickname.values()) {
      const roleReal = a.role.toLowerCase()
      if (roleWords.some((w) => roleReal.includes(w))) {
        candidate = a
        break
      }
    }
    if (!candidate) continue
    const oldChunk = m[0]
    const newChunk = oldChunk.replace(nickname, candidate.nickname)
    if (oldChunk === newChunk) continue
    out = out.split(oldChunk).join(newChunk)
    fixes.push({
      old_substring: oldChunk,
      new_substring: newChunk,
      reason: `« ${nickname} » → « ${candidate.nickname} » (rôle: ${roleLabel})`,
    })
  }
  return { html: out, fixes }
}

// ── Run unitaire (1 article) ────────────────────────────────────────────

interface ArticleAuditOutcome {
  id: number
  title: string
  link_rewrite: string
  blocks: number
  warnings: number
  issues: Issue[]
  fixes_applied: number
}

async function auditArticle(
  article: ArticleRow,
  agents: AgentMaps,
  mentors: { slug: string; mentor: string }[],
  others: { id: number; title: string; kw: Set<string>; slug: string }[],
  mode: AuditMode,
): Promise<ArticleAuditOutcome> {
  const issues: Issue[] = []
  issues.push(...checkAgentNames(article.content, agents))
  issues.push(...checkAgentCount(article.content, agents))
  issues.push(...checkBusinessFacts(article.content))
  issues.push(...checkInternalUrls(article.content))
  issues.push(...checkMentorAgentConflict(agents, mentors))
  issues.push(...checkCannibalization(article, others))

  let fixesApplied = 0
  // Auto-fix uniquement en mode active ET s'il existe au moins 1 BLOQUANT
  // de type agent_name (les autres types ne sont pas auto-fixables).
  if (mode === 'active') {
    const hasFixable = issues.some(
      (i) => i.type === 'agent_name' && i.severity === 'BLOQUANT',
    )
    if (hasFixable) {
      const { html: newContent, fixes } = tryFixAgentNames(article.content, agents)
      if (fixes.length && newContent !== article.content) {
        if (await applyContentFixProd(article.id, newContent)) {
          fixesApplied = fixes.length
        }
      }
    }
  }

  const blocks   = issues.filter((i) => i.severity === 'BLOQUANT').length
  const warnings = issues.filter((i) => i.severity === 'WARNING').length
  return {
    id: article.id, title: article.title, link_rewrite: article.link_rewrite,
    blocks, warnings, issues, fixes_applied: fixesApplied,
  }
}

// ── Audit pipeline ──────────────────────────────────────────────────────

interface AuditOutcome {
  mode: AuditMode
  total_articles: number
  total_blocks: number
  total_warnings: number
  total_fixed: number
  articles_with_issues: ArticleAuditOutcome[]
  summary: string
}

async function runAudit(log: AutomateLog): Promise<AuditOutcome> {
  const mode = getAuditMode(AUTOMATE_KEY)

  const t0 = Date.now()
  const agents   = await loadAgents()
  const mentors  = await loadAcademyMentors()
  const articles = await loadActiveArticles()
  log.step('load_db', 'ok',
    `${agents.count} agents + ${mentors.length} mentors + ${articles.length} articles`,
    Date.now() - t0)

  // Préparer les keyword sets pour la cannibalization (1 passe globale).
  const t1 = Date.now()
  const keywordIdx = articles.map((a) => ({
    id: a.id, title: a.title, slug: a.link_rewrite,
    kw: extractKeywords(`${a.title} ${a.content.slice(0, 2000)}`),
  }))
  log.step('keyword_index', 'ok', `${keywordIdx.length} articles indexés`, Date.now() - t1)

  const outcomes: ArticleAuditOutcome[] = []
  for (const a of articles) {
    outcomes.push(await auditArticle(a, agents, mentors, keywordIdx, mode))
  }

  const totalBlocks   = outcomes.reduce((n, o) => n + o.blocks, 0)
  const totalWarnings = outcomes.reduce((n, o) => n + o.warnings, 0)
  const totalFixed    = outcomes.reduce((n, o) => n + o.fixes_applied, 0)
  log.count('articles_total',   articles.length)
  log.count('issues_blocks',    totalBlocks)
  log.count('issues_warnings',  totalWarnings)
  log.count('fixes_applied',    totalFixed)

  const summary = mode === 'shadow'
    ? `[shadow] ${articles.length} articles : ${totalBlocks} bloquant(s), ${totalWarnings} warning(s) — fixes désactivés`
    : `${articles.length} articles : ${totalBlocks} bloquant(s), ${totalWarnings} warning(s), ${totalFixed} fix appliqués`

  return {
    mode,
    total_articles: articles.length,
    total_blocks: totalBlocks,
    total_warnings: totalWarnings,
    total_fixed: totalFixed,
    articles_with_issues: outcomes.filter((o) => o.blocks > 0 || o.warnings > 0 || o.fixes_applied > 0),
    summary,
  }
}

// ── Persistance DB-only ─────────────────────────────────────────────────

async function persistReport(outcome: AuditOutcome): Promise<void> {
  const sql = getPgClient()
  // Compact rapport : on garde seulement id+title+blocks+warnings et les
  // 3 premières issues par article. Le détail complet vit dans logs PM2.
  const compactArticles = outcome.articles_with_issues.map((a) => ({
    id: a.id,
    title: a.title.slice(0, 80),
    link_rewrite: a.link_rewrite,
    blocks: a.blocks,
    warnings: a.warnings,
    fixes_applied: a.fixes_applied,
    top_issues: a.issues.slice(0, 3).map((i) => ({
      type: i.type,
      severity: i.severity,
      detail: i.detail.slice(0, 200),
    })),
  }))
  const dataJson = JSON.stringify({
    date: new Date().toISOString(),
    mode: outcome.mode,
    total_articles: outcome.total_articles,
    total_blocks:   outcome.total_blocks,
    total_warnings: outcome.total_warnings,
    total_fixed:    outcome.total_fixed,
    articles_with_issues: compactArticles,
  })
  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'factcheck' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES
      ('factcheck', CURRENT_DATE, ${dataJson}, ${outcome.summary.slice(0, 500)}, NOW())
  `
}

// ── Nitro Task entrypoint ───────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:factcheck',
    description: 'Anti-hallucination articles publiés (port ac_factcheck, Wave 1 actif #3)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:factcheck')
    if (skip) return { result: skip }
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const outcome = await runAudit(log)
        await persistReport(outcome)
        const status = outcome.total_blocks > 0 ? 'partial' : 'ok'
        log.setResult(status, outcome.summary)
        return {
          status,
          mode: outcome.mode,
          total_articles: outcome.total_articles,
          total_blocks:   outcome.total_blocks,
          total_warnings: outcome.total_warnings,
          total_fixed:    outcome.total_fixed,
          summary:        outcome.summary,
        }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
