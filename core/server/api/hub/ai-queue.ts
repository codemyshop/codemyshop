

import {
  createAiTask,
  deleteTask,
  executeAiTask,
  readAiQueue,
  updateTask,
} from '~/server/utils/ai-queue'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return await readAiQueue(event)
  }

  if (method === 'POST') {
    const body = await readBody<{
      name: string; clientId: string; model: string
      systemPrompt: string; userPrompt: string; totalItems?: number
    }>(event)

    if (!body.name?.trim() || !body.systemPrompt?.trim()) {
      throw createError({ statusCode: 400, message: 'name et systemPrompt requis' })
    }

    const task = await createAiTask({
      name:         body.name.trim(),
      clientId:     body.clientId?.trim() || 'ac-hub',
      model:        body.model || 'claude-sonnet-4-6',
      systemPrompt: body.systemPrompt.trim(),
      userPrompt:   body.userPrompt?.trim() || '',
      totalItems:   body.totalItems,
    }, event)

    return { ok: true, task }
  }

  if (method === 'PUT') {
    const { action, id } = getQuery(event)

    if (action === 'exec' && id) {
      const task = await executeAiTask(id as string, event)
      return { ok: true, task }
    }

    const body = await readBody<{ id: string; status?: string }>(event)
    if (body.id && body.status) {
      await updateTask(body.id, { status: body.status as any }, event)
      return { ok: true }
    }

    throw createError({ statusCode: 400, message: 'action=exec&id=xxx ou body.id+status requis' })
  }

  if (method === 'DELETE') {
    const { id } = getQuery(event)
    if (!id) throw createError({ statusCode: 400, message: 'id requis' })
    await deleteTask(String(id), event)
    return { ok: true }
  }

  throw createError({ statusCode: 405 })
})
