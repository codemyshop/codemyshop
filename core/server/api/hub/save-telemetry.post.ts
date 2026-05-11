

import { insertAiTelemetry, countAiTelemetryEntries } from '~/internal/automates/server/utils/automates'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    taskId: string; model: string; clientId: string
    inputTokens: number; outputTokens: number; cost: number
    latencyMs: number; httpStatus: number; success: boolean
    errorMessage?: string
  }>(event)

  await insertAiTelemetry({
    taskId: body.taskId,
    model: body.model,
    clientId: body.clientId,
    inputTokens: body.inputTokens,
    outputTokens: body.outputTokens,
    cost: body.cost,
    latencyMs: body.latencyMs,
    httpStatus: body.httpStatus,
    success: body.success,
    errorMessage: body.errorMessage ?? null,
  }, { event })

  const totalEntries = await countAiTelemetryEntries({ event })
  return { ok: true, totalEntries }
})
