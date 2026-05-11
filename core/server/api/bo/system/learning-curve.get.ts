

import { execSync } from 'node:child_process'
import { requireRoleOrSaas } from '~/server/utils/session'
import { aggregateAgentsByWeeks, aggregateWeekly } from '~/internal/incidents/server/utils/incidents'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder'])

  const q = getQuery(event) as Record<string, string>
  const weeks = Math.max(4, Math.min(52, Number(q.weeks || 12)))
  const agent = (q.agent || '').trim() || null

  const [agents, dbRows] = await Promise.all([
    aggregateAgentsByWeeks(weeks, { event }),
    aggregateWeekly(weeks, agent, { event }),
  ])

  
  const commitsByWeek = new Map<string, number>()
  try {
    const out = execSync(
      `git -C ${process.cwd()} log --all --since="${weeks} weeks ago" --pretty=format:%ci`,
      { encoding: 'utf-8', timeout: 10_000 },
    )
    for (const line of out.split('\n')) {
      const d = line.slice(0, 10)
      if (!d) continue
      const dt = new Date(d + 'T00:00:00Z')
      if (isNaN(dt.getTime())) continue
      const week = isoWeekKey(dt)
      commitsByWeek.set(week, (commitsByWeek.get(week) || 0) + 1)
    }
  } catch {
    
  }

  
  const rows = dbRows.map((r) => {
    const total = r.total
    const qualified = r.qualified
    const commits = commitsByWeek.get(r.week) || 0
    return {
      week: r.week,
      weekStart: r.weekStart,
      total,
      qualified,
      commits,
      qualityRatio: total > 0 ? qualified / total : 0,
      scarRate: commits > 0 ? (total / commits) * 1000 : 0, 
    }
  })

  
  const knownWeeks = new Set(rows.map((r) => r.week))
  for (const [week, commits] of commitsByWeek) {
    if (!knownWeeks.has(week)) {
      rows.push({
        week,
        weekStart: weekKeyToDate(week),
        total: 0,
        qualified: 0,
        commits,
        qualityRatio: 0,
        scarRate: 0,
      })
    }
  }
  rows.sort((a, b) => String(a.weekStart).localeCompare(String(b.weekStart)))

  
  const totals = rows.reduce((acc, r) => ({
    total: acc.total + r.total,
    qualified: acc.qualified + r.qualified,
    commits: acc.commits + r.commits,
  }), { total: 0, qualified: 0, commits: 0 })

  return {
    weeks: rows,
    totals: {
      ...totals,
      qualityRatio: totals.total > 0 ? totals.qualified / totals.total : 0,
      scarRate: totals.commits > 0 ? (totals.total / totals.commits) * 1000 : 0,
    },
    windowWeeks: weeks,
    agent,
    agents,
  }
})

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function weekKeyToDate(key: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(key)
  if (!m) return ''
  const year = Number(m[1])
  const week = Number(m[2])
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const dayOfWeek = simple.getUTCDay()
  const isoMonday = new Date(simple)
  if (dayOfWeek <= 4) isoMonday.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1)
  else isoMonday.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay())
  return isoMonday.toISOString().slice(0, 10)
}
