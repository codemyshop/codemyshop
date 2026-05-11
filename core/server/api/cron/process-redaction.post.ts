

import { useClientDb } from '~/server/utils/db'
import {
  pickPendingItem,
  markProcessing,
  storeResult,
  markError,
} from '~/enterprise/ai/cms-queue/server/utils/cms-queue'
import { getClientConfigJson } from '~/internal/clientconfig/server/utils/clientconfig'

type QueueItem = Awaited<ReturnType<typeof pickPendingItem>> extends infer T
  ? T extends null ? never : T
  : never

interface LlmResponse {
  content_html: string
  meta_title: string
  meta_description: string
  optimized_slug: string
  faq_json: string
  word_count: number
  faq_count: number
}

function buildPrompt(item: QueueItem, existingContent: string = ''): string {
  const context = `Tu rédiges pour Example Shop (grossiste fruits secs B2B).
Cible : professionnels CHR, pâtissiers, épiciers, primeurs, magasins vrac.
Ton : expert, professionnel, accessible. Pas de tutoiement. Vouvoiement.
${item.instructions ? `\nConsignes supplémentaires : ${item.instructions}` : ''}`

  const articleInstruction = existingContent.trim()
    ? `AMÉLIORE et RESTRUCTURE l'article existant ci-dessous selon la charte EEAT.
Conserve toutes les informations factuelles. Enrichis avec du contenu expert, des tableaux, des citations d'autorité.

Titre : **${item.title}**
${item.meta_description ? `Meta description existante : ${item.meta_description}` : ''}

### CONTENU EXISTANT À ENRICHIR :
${existingContent}

---`
    : `Rédige un article de blog SEO complet en HTML propre pour le titre suivant :
**${item.title}**
${item.meta_description ? `\nMeta description existante : ${item.meta_description}` : ''}`

  return `${context}

${articleInstruction}

## CHARTE EEAT OBLIGATOIRE (structure minimale requise) :

1. **Minimum 5 sections H2** avec des titres riches en mots-clés
2. **Minimum 1 tableau HTML** (<table>) comparatif ou récapitulatif — avec <thead> et <tbody>
3. **Minimum 1 blockquote** — citation d'une source d'autorité avec attribution
4. **Minimum 2 listes** (<ul> ou <ol>) avec des points concrets
5. **Minimum 1500 mots** de contenu riche et actionnable
6. **4 liens internes minimum** (format : <a href="/blog/...">texte</a>)
7. **1 lien externe minimum** vers une source d'autorité vérifiable
8. **Chaque H2** : paragraphe d'intro + contenu riche (liste OU tableau OU blockquote)

## RÈGLES TECHNIQUES :
- HTML propre : h2, h3, p, ul, li, ol, strong, table, thead, tbody, tr, th, td, blockquote, a
- PAS de h1, PAS de FAQ dans le HTML, PAS d'images, PAS de balises html/head/body
- PAS d'entités HTML (&rsquo; etc.) — UTF-8 pur
- Terminer par une synthèse/conclusion

## EN PLUS, GÉNÈRE :
- Une **meta_title** optimisée CTR (≤ 60 chars)
- Une **meta_description** optimisée CTR (145-160 chars)
- Un **slug** SEO en 3 segments : pilier--sous-cat--slug
- **15 FAQ minimum** au format JSON : [{"q": "...", "a": "..."}]

Retourne le tout dans ce format exact :
---CONTENT---
(le HTML ici)
---META_TITLE---
(title ici)
---META_DESCRIPTION---
(description ici)
---SLUG---
(slug ici)
---FAQ_JSON---
(le JSON array ici)`
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const modelId = model === 'gemini-2.5-flash' ? 'gemini-2.5-flash-preview-05-20' : model
  const res = await $fetch<any>(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
    method: 'POST',
    body: {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
    },
    timeout: 120000,
  })
  return res?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callClaude(prompt: string, apiKey: string, model: string): Promise<string> {
  const modelId = model === 'claude-sonnet-4' ? 'claude-sonnet-4-20250514' : model
  const res = await $fetch<any>('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: {
      model: modelId,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    },
    timeout: 120000,
  })
  return res?.content?.[0]?.text || ''
}

async function callOpenAI(prompt: string, apiKey: string, model: string): Promise<string> {
  const modelId = model === 'gpt-4o' ? 'gpt-4o' : model
  const res = await $fetch<any>('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192,
      temperature: 0.7,
    },
    timeout: 120000,
  })
  return res?.choices?.[0]?.message?.content || ''
}

function parseResponse(raw: string): LlmResponse {
  const contentMatch = raw.match(/---CONTENT---\s*\n([\s\S]*?)(?=---META_TITLE---|---SLUG---|---FAQ_JSON---|$)/i)
  const titleMatch = raw.match(/---META_TITLE---\s*\n([\s\S]*?)(?=---META_DESCRIPTION---|---SLUG---|---FAQ_JSON---|$)/i)
  const descMatch = raw.match(/---META_DESCRIPTION---\s*\n([\s\S]*?)(?=---SLUG---|---FAQ_JSON---|$)/i)
  const slugMatch = raw.match(/---SLUG---\s*\n([\s\S]*?)(?=---FAQ_JSON---|$)/i)
  const faqMatch = raw.match(/---FAQ_JSON---\s*\n([\s\S]*?)$/i)

  let html = contentMatch ? contentMatch[1].trim() : raw.trim()
  html = html.replace(/^```html?\s*\n?/, '').replace(/\n?```\s*$/, '')

  const metaTitle = titleMatch ? titleMatch[1].trim() : ''
  const metaDesc = descMatch ? descMatch[1].trim() : ''
  const slug = slugMatch ? slugMatch[1].trim() : ''

  let faqJson = '[]'
  let faqCount = 0
  if (faqMatch) {
    const faqRaw = faqMatch[1].trim().replace(/^```json?\s*\n?/, '').replace(/\n?```\s*$/, '')
    try {
      const parsed = JSON.parse(faqRaw)
      if (Array.isArray(parsed)) {
        faqJson = JSON.stringify(parsed)
        faqCount = parsed.length
      }
    } catch {  }
  }

  const plain = html.replace(/<[^>]+>/g, ' ')
  const wordCount = plain.split(/\s+/).filter(Boolean).length

  return { content_html: html, meta_title: metaTitle, meta_description: metaDesc, optimized_slug: slug, faq_json: faqJson, word_count: wordCount, faq_count: faqCount }
}

function getProvider(model: string): 'google' | 'anthropic' | 'openai' {
  if (model.startsWith('gemini')) return 'google'
  if (model.startsWith('claude')) return 'anthropic'
  return 'openai'
}

export default defineEventHandler(async (event) => {
  
  const host = getHeader(event, 'host') || ''
  const forwarded = getHeader(event, 'x-forwarded-for') || ''
  if (!host.startsWith('localhost') && !host.startsWith('127.0.0.1') && !forwarded.includes('127.0.0.1')) {
    throw createError({ statusCode: 403, message: 'Cron endpoint: localhost only' })
  }

  
  const item = await pickPendingItem({ event })
  if (!item) {
    return { processed: false, message: 'Queue vide' }
  }

  
  await markProcessing(item.id_redaction, { event })

  
  const db = useClientDb(event)

  try {
    
    const configJson = await getClientConfigJson(item.tenant, { event })
    const config = configJson ? JSON.parse(configJson) : {}
    const aiKeys = config.aiKeys || {}

    const provider = getProvider(item.model || 'gemini-2.5-flash')
    const apiKey = aiKeys[provider]

    if (!apiKey) {
      throw new Error(`Clé API ${provider} non configurée. Ajoutez-la dans Hub > Admin > Features (aiKeys.${provider})`)
    }

    
    let existingContent = ''
    try {
      const cms = await db.query<{ content: string }>(
        'SELECT content FROM ps_cms_lang WHERE id_cms = ? AND id_lang = 1 LIMIT 1',
        [item.id_cms]
      )
      if (cms.length) existingContent = cms[0].content || ''
    } catch {  }

    
    const prompt = buildPrompt(item, existingContent)
    let rawResponse: string

    if (provider === 'google') {
      rawResponse = await callGemini(prompt, apiKey, item.model)
    } else if (provider === 'anthropic') {
      rawResponse = await callClaude(prompt, apiKey, item.model)
    } else {
      rawResponse = await callOpenAI(prompt, apiKey, item.model)
    }

    if (!rawResponse) {
      throw new Error('Réponse LLM vide')
    }

    
    const result = parseResponse(rawResponse)

    
    await storeResult(item.id_redaction, {
      contentHtml: result.content_html,
      faqJson: result.faq_json,
      wordCount: result.word_count,
      faqCount: result.faq_count,
      metaTitle: result.meta_title,
      metaDescription: result.meta_description,
      optimizedSlug: result.optimized_slug,
    }, { event })

    return {
      processed: true,
      id_redaction: item.id_redaction,
      model: item.model,
      word_count: result.word_count,
      faq_count: result.faq_count,
    }
  } catch (err: any) {
    const errMsg = String(err?.message || err)
    await markError(item.id_redaction, errMsg, { event })
    return {
      processed: false,
      id_redaction: item.id_redaction,
      error: errMsg.substring(0, 500),
    }
  }
})
