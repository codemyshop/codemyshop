/**
 * Shared utility to read modules/lessons from the database (cs_academy_module + cs_academy_lesson).
 * Source unique : DB (cs_academy_module + cs_academy_lesson).
 *
 */

export interface AcademyLesson {
  title: string
  content: string
  takeaway: string
  slug?: string
  mentorQuote?: string
  mentorSource?: string
  dictionaryTerms?: string[]
}

export interface AcademyLessonWithMeta extends AcademyLesson {
  slug: string
  index: number
}

export interface AcademyModule {
  id: number
  position: number
  slug: string
  title: string
  description: string
  icon: string
  difficulty: string
  duration: string
  mentor?: string
  lessons: AcademyLesson[]
}

export interface AcademyModuleWithMeta extends Omit<AcademyModule, 'lessons'> {
  lessons: AcademyLessonWithMeta[]
  totalModules: number
  prev?: { slug: string; title: string }
  next?: { slug: string; title: string }
}

interface AcademyMentor {
  name: string
  title: string
  domain: string
  philosophy: string
  quote: string
  era: string
  icon: string
}

interface AcademyData {
  title: string
  subtitle: string
  author: string
  modules: AcademyModule[]
  mentors: Record<string, AcademyMentor>
}

// Stop words FR à supprimer des slugs
const STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'au', 'aux',
  'ce', 'ces', 'par', 'pour', 'sur', 'dans', 'avec', 'est', 'son', 'sa', 'ses',
  'qui', 'que', 'ne', 'pas', 'plus', 'ou', 'se', 'mon', 'ton', 'nos', 'vos',
  'tout', 'tous', 'toute', 'votre', 'notre', 'leur', 'leurs', 'comme', 'mais',
  'si', 'ni', 'y', 'a', 'l', 'd', 'n', 'the', 'of', 'and', 'to', 'in', 'is',
])

export function slugifyLesson(title: string): string {
  return title
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')                      // keep alphanumeric + spaces
    .split(/[\s-]+/)                                    // split on spaces/hyphens
    .filter(w => w.length > 0 && !STOP_WORDS.has(w))   // remove stop words
    .slice(0, 5)                                        // max 5 words
    .join('-')
    .slice(0, 60)                                       // max 60 chars
}

// ── DB cache par client (évite une connexion par requête) ────────────────────
const _dbCacheMap = new Map<string, { data: AcademyData; ts: number }>()
const DB_CACHE_TTL = 300_000 // 5 min — academy data changes rarely

async function loadFromDb(): Promise<AcademyData | null> {
  const config = useRuntimeConfig()
  const clientId = (config.clientId as string) || 'ac-hub'
  const cached = _dbCacheMap.get(clientId)
  if (cached && Date.now() - cached.ts < DB_CACHE_TTL) return cached.data
  try {
    const {
      listActiveLessons,
      listActiveMentors,
      listActiveModules,
    } = await import('~/internal/academy/server/utils/academy')

    // Pas d'event ici (utilitaire chargé en background) → on cible la DB globale.
    const [modRows, lessonRows, mentorRows] = await Promise.all([
      listActiveModules(clientId, { global: true }),
      listActiveLessons(clientId, { global: true }),
      listActiveMentors({ global: true }),
    ])

    const modules = modRows.map((m: any) => {
      const lessons = lessonRows
        .filter((l: any) => l.module_slug === m.slug)
        .map((l: any) => ({
          title: l.title,
          content: l.content,
          takeaway: l.takeaway || '',
          slug: l.slug,
          mentorQuote: l.mentor_quote || '',
          mentorSource: l.mentor_source || '',
          dictionaryTerms: safeJson(l.dictionary_terms),
        }))
      return {
        id: m.id_module,
        position: m.position || 0,
        slug: m.slug,
        title: m.title,
        description: m.description || '',
        icon: m.icon || '',
        difficulty: m.difficulty || 'debutant',
        duration: m.duration || '',
        mentor: m.mentor || '',
        lessons,
      }
    })

    const mentors: Record<string, AcademyMentor> = {}
    for (const r of mentorRows as any[]) {
      mentors[r.mentor_key] = {
        name: r.name,
        title: r.title,
        domain: r.domain || '',
        philosophy: r.philosophy || '',
        quote: r.quote || '',
        era: r.era || '',
        icon: r.icon || '',
      }
    }

    const data: AcademyData = { title: 'Academy', subtitle: '', author: 'CodeMyShop', modules, mentors }
    _dbCacheMap.set(clientId, { data, ts: Date.now() })
    return data
  } catch {
    return null
  }
}

function safeJson(str: string | null): string[] {
  if (!str) return []
  try { return JSON.parse(str) } catch { return [] }
}

const _emptyData: AcademyData = { title: '', subtitle: '', author: '', modules: [], mentors: {} }

export async function getAllModulesAsync(): Promise<AcademyData> {
  return await loadFromDb() ?? _emptyData
}

// Sync (cache only — DB must have been loaded at least once)
export function getAllModules(): AcademyData {
  const config = useRuntimeConfig()
  const clientId = (config.clientId as string) || 'ac-hub'
  return _dbCacheMap.get(clientId)?.data ?? _emptyData
}

export async function getModuleBySlugAsync(slug: string): Promise<AcademyModuleWithMeta | null> {
  const data = await getAllModulesAsync()
  return _resolveModule(data, slug)
}

export function getModuleBySlug(slug: string): AcademyModuleWithMeta | null {
  const config = useRuntimeConfig()
  const clientId = (config.clientId as string) || 'ac-hub'
  const data = _dbCacheMap.get(clientId)?.data ?? _emptyData
  return _resolveModule(data, slug)
}

export function findModuleByPartialSlug(slug: string): AcademyModuleWithMeta | null {
  const config = useRuntimeConfig()
  const clientId = (config.clientId as string) || 'ac-hub'
  const data = _dbCacheMap.get(clientId)?.data ?? _emptyData
  // Match exact d'abord
  const exact = data.modules.find(m => m.slug === slug)
  if (exact) return null // pas un partial match
  // Slug partiel : cherche un module dont le slug commence par ou contient le slug demandé
  const partial = data.modules.find(m => m.slug.startsWith(slug + '-') || m.slug === `le-${slug}`)
  return partial ?? null
}

function _resolveModule(data: AcademyData, slug: string): AcademyModuleWithMeta | null {
  const idx = data.modules.findIndex(m => m.slug === slug)
  if (idx === -1) return null
  const mod = data.modules[idx]

  return {
    ...mod,
    lessons: mod.lessons.map((l, i) => ({
      ...l,
      slug: l.slug || slugifyLesson(l.title),
      index: i,
    })),
    totalModules: data.modules.length,
    prev: idx > 0 ? { slug: data.modules[idx - 1].slug, title: data.modules[idx - 1].title } : undefined,
    next: idx < data.modules.length - 1 ? { slug: data.modules[idx + 1].slug, title: data.modules[idx + 1].title } : undefined,
  }
}

export function getLessonBySlug(moduleSlug: string, lessonSlug: string): { lesson: AcademyLessonWithMeta; module: AcademyModuleWithMeta } | null {
  const mod = getModuleBySlug(moduleSlug)
  if (!mod) return null
  const lesson = mod.lessons.find(l => l.slug === lessonSlug)
  if (!lesson) return null
  return { lesson, module: mod }
}

export function getLesson(moduleSlug: string, lessonIndex: number): AcademyLesson | null {
  const data = getAllModules()
  const mod = data.modules.find(m => m.slug === moduleSlug)
  if (!mod) return null
  return mod.lessons[lessonIndex] ?? null
}
