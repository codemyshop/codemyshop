

import {
  replacePlaybookRoles,
  upsertPlaybook,
} from '~/modules/playbook/server/utils/playbook'

interface PlaybookBody {
  id?: number
  title: string
  slug: string
  description?: string
  content_json?: string
  status?: 'draft' | 'published' | 'archived'
  position?: number
  roles?: string[]
  created_by?: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PlaybookBody>(event)
  if (!body.title?.trim()) throw createError({ statusCode: 400, message: 'Titre requis' })
  if (!body.slug?.trim()) throw createError({ statusCode: 400, message: 'Slug requis' })

  const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const status = body.status || 'draft'
  const roles = body.roles?.filter(Boolean) || []

  const playbookId = await upsertPlaybook({
    id: body.id,
    title: body.title.trim(),
    slug,
    description: body.description?.trim() || '',
    contentJson: body.content_json || '[]',
    status,
    position: body.position ?? 0,
    createdBy: body.created_by || null,
  }, { event })

  await replacePlaybookRoles(playbookId, roles, { event })

  return { success: true, id: playbookId, slug }
})
