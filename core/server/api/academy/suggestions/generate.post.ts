

import { getAllModules } from '~/server/utils/academy-content'
import { getSuggestion } from '~/server/utils/academy-db'
import { createAiTask } from '~/server/utils/ai-queue'

export default defineEventHandler(async (event) => {
  const academy = getAllModules()
  let created = 0

  for (const mod of academy.modules) {
    for (let i = 0; i < mod.lessons.length; i++) {
      const lesson = mod.lessons[i]

      const existing = await getSuggestion(mod.slug, i)
      if (existing) continue

      await createAiTask({
        name: `academy-suggestion:${mod.slug}:${i}`,
        clientId: 'ac-hub',
        model: 'mistral-large-latest',
        systemPrompt: `Tu génères UNE question pertinente qu'un étudiant e-commerce se poserait naturellement après avoir lu cette leçon. La question doit être concrète, orientée pratique, et inciter à l'action. Pas de question générique. Maximum 120 caractères. Réponds UNIQUEMENT avec la question, sans guillemets ni préfixe.`,
        userPrompt: `Module: ${mod.title}\nLeçon: ${lesson.title}\nContenu: ${lesson.content}\nÀ retenir: ${lesson.takeaway}`,
      }, event)
      created++
    }
  }

  return { success: true, tasksCreated: created }
})
