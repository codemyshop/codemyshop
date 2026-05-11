

import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'
import { aiQueueVaisseau, type AiQueuePgRow } from '../db/schema-pg/ai-queue'
import { callAnthropicRaw } from './anthropic'

export type AiTaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface AiTask {
  id:              string
  name:            string
  clientId:        string
  model:           string
  status:          AiTaskStatus
  
  totalItems:      number
  completedItems:  number
  
  systemPrompt:    string
  userPrompt:      string
  
  response?:       string
  errorMessage?:   string
  
  estimatedTokens: { input: number; output: number; total: number }
  actualTokens?:   { prompt: number; completion: number; total: number }
  estimatedCost:   number   
  actualCost?:     number   
  
  latencyMs?:      number
  httpStatus?:     number
  
  createdAt:       string
  startedAt?:      string
  completedAt?:    string
}

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6':          { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001':  { input: 0.80,  output: 4.00 },
  'claude-opus-4-6':            { input: 15.00, output: 75.00 },
  'gpt-4o':                     { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':                { input: 0.15,  output: 0.60 },
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['claude-sonnet-4-6']
  return ((inputTokens * pricing.input) + (outputTokens * pricing.output)) / 1_000_000
}

export function calculateActualCost(model: string, usage: { prompt_tokens: number; completion_tokens: number }): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['claude-sonnet-4-6']
  return ((usage.prompt_tokens * pricing.input) + (usage.completion_tokens * pricing.output)) / 1_000_000
}

function toIso(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined
  return typeof d === 'string' ? d : d.toISOString()
}

function rowToTask(r: AiQueuePgRow): AiTask {
  const tokensIn = Number(r.tokensIn ?? 0)
  const tokensOut = Number(r.tokensOut ?? 0)
  const tokens = tokensIn + tokensOut
  return {
    id:             r.taskId,
    name:           r.name,
    clientId:       r.clientId,
    model:          r.model,
    status:         r.status as AiTaskStatus,
    totalItems:     Number(r.totalItems ?? 1),
    completedItems: Number(r.completedItems ?? 0),
    systemPrompt:   r.systemPrompt ?? '',
    userPrompt:     r.userPrompt ?? '',
    response:       r.response ?? undefined,
    errorMessage:   r.errorMessage ?? undefined,
    estimatedTokens: {
      input: 0, output: 0, total: 0, 
    },
    actualTokens: tokens > 0
      ? { prompt: tokensIn, completion: tokensOut, total: tokens }
      : undefined,
    estimatedCost: Number(r.estimatedCost ?? 0),
    actualCost:    Number(r.cost ?? 0) || undefined,
    latencyMs:     r.latencyMs ?? undefined,
    httpStatus:    r.httpStatus ?? undefined,
    createdAt:     toIso(r.dateAdd) ?? new Date().toISOString(),
    startedAt:     toIso(r.startedAt),
    completedAt:   toIso(r.completedAt),
  }
}

export async function readAiQueue(_event?: any, limit = 200): Promise<AiTask[]> {
  const d = usePocPg()
  const rows = await d
    .select()
    .from(aiQueueVaisseau)
    .orderBy(sql`date_add DESC`)
    .limit(Math.max(1, Math.min(500, limit)))
  return (rows as AiQueuePgRow[]).map(rowToTask)
}

export async function getTask(id: string, _event?: any): Promise<AiTask | null> {
  if (!id) return null
  const d = usePocPg()
  const r = (await d.select().from(aiQueueVaisseau).where(eq(aiQueueVaisseau.taskId, id)).limit(1))[0]
  return r ? rowToTask(r as AiQueuePgRow) : null
}

export async function deleteTask(id: string, _event?: any): Promise<boolean> {
  if (!id) return false
  const d = usePocPg()
  await d.execute(sql`DELETE FROM cs_main.cs_aiqueue WHERE task_id = ${id}`)
  return true
}

export async function updateTask(id: string, patch: Partial<AiTask>, _event?: any): Promise<void> {
  if (!id) return
  const d = usePocPg()

  const sets: any[] = []
  if (patch.status !== undefined)         sets.push(sql`status = ${patch.status}`)
  if (patch.completedItems !== undefined) sets.push(sql`completed_items = ${patch.completedItems}`)
  if (patch.response !== undefined)       sets.push(sql`response = ${patch.response}`)
  if (patch.errorMessage !== undefined)   sets.push(sql`error_message = ${patch.errorMessage}`)
  if (patch.actualTokens) {
    sets.push(sql`tokens_in = ${patch.actualTokens.prompt}`)
    sets.push(sql`tokens_out = ${patch.actualTokens.completion}`)
  }
  if (patch.actualCost !== undefined)     sets.push(sql`cost = ${patch.actualCost}`)
  if (patch.latencyMs !== undefined)      sets.push(sql`latency_ms = ${patch.latencyMs}`)
  if (patch.httpStatus !== undefined)     sets.push(sql`http_status = ${patch.httpStatus}`)
  if (patch.startedAt !== undefined)      sets.push(sql`started_at = ${patch.startedAt}`)
  if (patch.completedAt !== undefined)    sets.push(sql`completed_at = ${patch.completedAt}`)
  if (patch.name !== undefined)           sets.push(sql`name = ${patch.name}`)
  if (patch.clientId !== undefined)       sets.push(sql`client_id = ${patch.clientId}`)

  if (!sets.length) return
  sets.push(sql`date_upd = NOW()`)

  await d.execute(sql`
    UPDATE cs_main.cs_aiqueue SET ${sql.join(sets, sql`, `)} WHERE task_id = ${id}
  `)
}

export interface AiQueueStats {
  total:          number
  pending:        number
  processing:     number
  completed:      number
  failed:         number
  totalCostUsd:   number
  totalTokens:    number
}

export async function getStats(_event?: any): Promise<AiQueueStats> {
  const d = usePocPg()
  const rows: any = await d.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN status = 'pending'    THEN 1 ELSE 0 END)::int AS pending,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END)::int AS processing,
      SUM(CASE WHEN status = 'completed'  THEN 1 ELSE 0 END)::int AS completed,
      SUM(CASE WHEN status = 'failed'     THEN 1 ELSE 0 END)::int AS failed,
      COALESCE(SUM(cost), 0) AS total_cost,
      COALESCE(SUM(tokens_in + tokens_out), 0)::bigint AS total_tokens
    FROM cs_main.cs_aiqueue
  `)
  const r: any = rows?.[0] ?? {}
  return {
    total:        Number(r.total || 0),
    pending:      Number(r.pending || 0),
    processing:   Number(r.processing || 0),
    completed:    Number(r.completed || 0),
    failed:       Number(r.failed || 0),
    totalCostUsd: Number(r.total_cost || 0),
    totalTokens:  Number(r.total_tokens || 0),
  }
}

export async function createAiTask(
  params: {
    name: string; clientId: string; model: string
    systemPrompt: string; userPrompt: string; totalItems?: number
  },
  _event?: any,
): Promise<AiTask> {
  const inputTokens  = estimateTokens(params.systemPrompt + params.userPrompt)
  const outputTokens = Math.ceil(inputTokens * 0.8)
  const cost = estimateCost(params.model, inputTokens, outputTokens)

  const taskId = randomUUID()
  const name = params.name.slice(0, 200)
  const clientId = params.clientId.slice(0, 50)
  const systemPrompt = params.systemPrompt.slice(0, 5000)
  const userPrompt = params.userPrompt.slice(0, 5000)
  const totalItems = params.totalItems ?? 1
  const estimatedCost = Math.round(cost * 1_000_000) / 1_000_000

  const d = usePocPg()
  await d.execute(sql`
    INSERT INTO cs_main.cs_aiqueue
      (task_id, provider, model, status, client_id, name,
       system_prompt, user_prompt, total_items, completed_items,
       estimated_cost, date_add, date_upd)
    VALUES
      (${taskId}, 'anthropic', ${params.model}, 'pending', ${clientId}, ${name},
       ${systemPrompt}, ${userPrompt}, ${totalItems}, 0,
       ${estimatedCost}, NOW(), NOW())
  `)

  return {
    id:              taskId,
    name,
    clientId,
    model:           params.model,
    status:          'pending',
    totalItems,
    completedItems:  0,
    systemPrompt,
    userPrompt,
    estimatedTokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
    estimatedCost,
    createdAt:       new Date().toISOString(),
  }
}

export async function executeAiTask(taskId: string, event?: any): Promise<AiTask> {
  const task = await getTask(taskId, event)
  if (!task) throw new Error('Task not found')

  const startedAt = new Date().toISOString()
  await updateTask(taskId, { status: 'processing', startedAt }, event)

  const startTime = Date.now()

  try {
    const config = useRuntimeConfig()
    const apiKey = config.anthropicApiKey as string

    if (!apiKey) {
      
      const stubResponse = '[STUB] Réponse IA simulée — activez ANTHROPIC_API_KEY.'
      const completedAt = new Date().toISOString()
      await updateTask(taskId, {
        status:         'completed',
        completedItems: task.totalItems,
        response:       stubResponse,
        latencyMs:      Date.now() - startTime,
        httpStatus:     200,
        completedAt,
      }, event)
      return (await getTask(taskId, event))!
    }

    const res = await callAnthropicRaw({
      apiKey,
      model: task.model,
      systemPrompt: task.systemPrompt,
      userPrompt: task.userPrompt,
      maxTokens: 2048,
    })

    const latencyMs = Date.now() - startTime
    const responseText = res.content ?? ''
    const actualTokens = {
      prompt:     res.inputTokens,
      completion: res.outputTokens,
      total:      res.inputTokens + res.outputTokens,
    }
    const actualCost = calculateActualCost(task.model, {
      prompt_tokens:     actualTokens.prompt,
      completion_tokens: actualTokens.completion,
    })
    const completedAt = new Date().toISOString()

    await updateTask(taskId, {
      status:         'completed',
      completedItems: task.totalItems,
      response:       responseText.slice(0, 10000),
      actualTokens,
      actualCost:     Math.round(actualCost * 1_000_000) / 1_000_000,
      latencyMs,
      httpStatus:     200,
      completedAt,
    }, event)

    return (await getTask(taskId, event))!

  } catch (err: any) {
    const completedAt = new Date().toISOString()
    await updateTask(taskId, {
      status:       'failed',
      errorMessage: (err?.message ?? 'Unknown error').slice(0, 500),
      latencyMs:    Date.now() - startTime,
      httpStatus:   err?.statusCode ?? 500,
      completedAt,
    }, event)
    return (await getTask(taskId, event))!
  }
}
