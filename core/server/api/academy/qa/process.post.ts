/**
 * POST /api/academy/qa/process
 * Worker: processes pending academy-* tasks in the AI queue — direct Drizzle DB.
 *   - academy-qa:{id} → INSERT ai_answer + status='published'
 *   - academy-suggestion:{slug}:{index} → UPSERT cs_academy_suggestion
 *
 * Called by cron (every 2 minutes) or manually.
 *
 */

import { readAiQueue, executeAiTask } from '~/server/utils/ai-queue'
import { updateQaAiAnswer, upsertSuggestion } from '~/server/utils/academy-db'

export default defineEventHandler(async (event) => {
  const allTasks = await readAiQueue(event)
  const pending = allTasks.filter(t =>
    (t.name.startsWith('academy-qa:') || t.name.startsWith('academy-suggestion:')) && t.status === 'pending'
  )

  if (!pending.length) {
    return { success: true, processed: 0, message: 'Aucune tâche en attente' }
  }

  const results: { name: string; task_id: string; status: string }[] = []

  for (const task of pending) {
    try {
      const completed = await executeAiTask(task.id, event)

      if (completed.status !== 'completed' || !completed.response) {
        results.push({ name: task.name, task_id: task.id, status: 'failed' })
        continue
      }

      // ── Q&A : push réponse ────────────────────────────────────────
      if (task.name.startsWith('academy-qa:')) {
        const idQa = parseInt(task.name.replace('academy-qa:', ''), 10)
        if (!idQa) continue

        const r = await updateQaAiAnswer(idQa, completed.response, 'published')
        results.push({ name: task.name, task_id: task.id, status: r.ok ? 'published' : `failed:${r.error}` })
      }

      // ── Suggestion : push question suggérée ───────────────────────
      if (task.name.startsWith('academy-suggestion:')) {
        const parts = task.name.replace('academy-suggestion:', '').split(':')
        const moduleSlug = parts[0]
        const lessonIndex = parseInt(parts[1], 10)

        await upsertSuggestion(moduleSlug, lessonIndex, completed.response.trim())
        results.push({ name: task.name, task_id: task.id, status: 'saved' })
      }
    } catch (err) {
      console.error(`[academy/process] Erreur tâche ${task.id}:`, err)
      results.push({ name: task.name, task_id: task.id, status: 'error' })
    }
  }

  return { success: true, processed: results.length, results }
})
