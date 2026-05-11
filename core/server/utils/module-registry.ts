

import { eq, and, sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import {
  moduleRegistryVaisseau,
  type ModuleManifest,
  type ModuleRegistryPgRow,
  type ModuleStatus,
  type Runtime,
} from '../db/schema-pg/module-registry'

export type { Runtime, ModuleStatus, ModuleManifest }
export type ModuleRegistryRow = ModuleRegistryPgRow

interface RegistryContext {
  event?: any
  clientId?: string
}

export async function getModule(
  codename: string,
  _ctx: RegistryContext = {},
): Promise<ModuleRegistryRow | null> {
  const rows = await usePocPg()
    .select()
    .from(moduleRegistryVaisseau)
    .where(eq(moduleRegistryVaisseau.codename, codename))
    .limit(1)
  return rows[0] ?? null
}

export async function listModules(
  filter: { runtime?: Runtime; status?: ModuleStatus } = {},
  _ctx: RegistryContext = {},
): Promise<ModuleRegistryRow[]> {
  const conds: any[] = []
  if (filter.runtime) conds.push(eq(moduleRegistryVaisseau.runtime, filter.runtime))
  if (filter.status) conds.push(eq(moduleRegistryVaisseau.status, filter.status))

  const q = usePocPg().select().from(moduleRegistryVaisseau)
  return conds.length ? await q.where(and(...conds)) : await q
}

export async function setRuntime(
  codename: string,
  runtime: Runtime,
  manifest: ModuleManifest | null = null,
  ctx: RegistryContext = {},
): Promise<ModuleRegistryRow> {
  const existing = await getModule(codename, ctx)
  if (!existing) throw new Error(`[module-registry] module inconnu : ${codename}`)
  if (existing.status !== 'active') {
    throw new Error(`[module-registry] ${codename} non actif (status=${existing.status})`)
  }
  if (runtime === 'nuxt' && !manifest && !existing.manifestJson) {
    throw new Error(`[module-registry] runtime='nuxt' requiert un manifest pour ${codename}`)
  }

  await usePocPg()
    .update(moduleRegistryVaisseau)
    .set({
      runtime,
      manifestJson: manifest ?? existing.manifestJson,
      lastMigratedAt: new Date(),
      dateUpd: new Date(),
    })
    .where(eq(moduleRegistryVaisseau.codename, codename))

  return (await getModule(codename, ctx))!
}

export async function upsertModule(
  input: {
    codename: string
    version: string
    runtime?: Runtime
    status?: ModuleStatus
    schemaHash?: string
    manifest?: ModuleManifest
  },
  ctx: RegistryContext = {},
): Promise<ModuleRegistryRow> {
  const existing = await getModule(input.codename, ctx)
  if (existing) {
    await usePocPg()
      .update(moduleRegistryVaisseau)
      .set({
        version: input.version,
        ...(input.runtime ? { runtime: input.runtime } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.schemaHash ? { schemaHash: input.schemaHash } : {}),
        ...(input.manifest ? { manifestJson: input.manifest } : {}),
        dateUpd: new Date(),
      })
      .where(eq(moduleRegistryVaisseau.codename, input.codename))
    return (await getModule(input.codename, ctx))!
  }

  await usePocPg().insert(moduleRegistryVaisseau).values({
    codename: input.codename,
    version: input.version,
    runtime: input.runtime ?? 'ps',
    status: input.status ?? 'active',
    schemaHash: input.schemaHash ?? null,
    manifestJson: input.manifest ?? null,
    dateAdd: new Date(),
    dateUpd: new Date(),
  })
  return (await getModule(input.codename, ctx))!
}

export async function isNuxtNative(
  codename: string,
  ctx: RegistryContext = {},
): Promise<boolean> {
  const row = await getModule(codename, ctx)
  return !!row && row.runtime === 'nuxt' && row.status === 'active'
}

export async function getRuntimeStats(
  _ctx: RegistryContext = {},
): Promise<{ ps: number; nuxt: number; total: number }> {
  const rows = await usePocPg()
    .select({
      runtime: moduleRegistryVaisseau.runtime,
      n: sql<number>`COUNT(*)::int`,
    })
    .from(moduleRegistryVaisseau)
    .where(eq(moduleRegistryVaisseau.status, 'active'))
    .groupBy(moduleRegistryVaisseau.runtime)

  const stats = { ps: 0, nuxt: 0, total: 0 }
  for (const r of rows) {
    if (r.runtime === 'ps') stats.ps = Number(r.n)
    if (r.runtime === 'nuxt') stats.nuxt = Number(r.n)
  }
  stats.total = stats.ps + stats.nuxt
  return stats
}
