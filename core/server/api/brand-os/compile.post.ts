

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'

interface BrandFoundation {
  vision:    string
  mission:   string
  values:    string
  manifesto: string
}

interface BrandMarketing {
  persona: string
  swot:    string
  tone:    string
  mix:     string
}

interface VoiceOfCustomer {
  searchIntents: string[]
  frictions:     string[]
  verbatims:     { text: string; author: string }[]
}

interface CompilePayload {
  clientId:        string
  foundation:      BrandFoundation
  marketing:       BrandMarketing
  voiceOfCustomer: VoiceOfCustomer
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CompilePayload>(event)

  if (!body.clientId?.trim()) {
    throw createError({ statusCode: 400, message: 'clientId requis' })
  }

  const clientId = body.clientId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')

  try {
    
    const markdown = buildContextMarkdown(body)

    
    const contextsDir = resolve(process.cwd(), '.data', 'contexts')
    await mkdir(contextsDir, { recursive: true })

    const filePath = resolve(contextsDir, `CONTEXT_${clientId.toUpperCase()}.md`)
    await writeFile(filePath, markdown, 'utf-8')

    
    const wordCount = markdown.split(/\s+/).length
    const sections  = (markdown.match(/^## /gm) || []).length

    return {
      success:   true,
      message:   `Cerveau IA compilé avec succès (${wordCount} mots, ${sections} sections)`,
      filePath:  `.data/contexts/CONTEXT_${clientId.toUpperCase()}.md`,
      wordCount,
      sections,
      compiledAt: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error('[brand-os/compile] Error:', err?.message || err)
    throw createError({
      statusCode: 500,
      message: `Erreur de compilation : ${err?.message || 'Erreur inconnue'}`,
    })
  }
})

function buildContextMarkdown(data: CompilePayload): string {
  const { foundation: f, marketing: m, voiceOfCustomer: v, clientId } = data
  const date = new Date().toISOString().split('T')[0]

  const lines: string[] = [
    `# SYSTEM CONTEXT: BRAND OS — ${clientId.toUpperCase()}`,
    ``,
    `> Ce document est le contexte de marque injecté dans chaque requête IA.`,
    `> Généré automatiquement le ${date}. Ne pas modifier manuellement.`,
    ``,
    `---`,
    ``,
  ]

  
  lines.push(`## 1. FONDATIONS (Dirigeant)`, ``)

  if (f.vision?.trim()) {
    lines.push(`### Vision`, ``, f.vision.trim(), ``)
  }
  if (f.mission?.trim()) {
    lines.push(`### Mission`, ``, f.mission.trim(), ``)
  }
  if (f.values?.trim()) {
    lines.push(`### Valeurs`, ``, f.values.trim(), ``)
  }
  if (f.manifesto?.trim()) {
    lines.push(`### Manifeste du Dirigeant`, ``, f.manifesto.trim(), ``)
  }

  lines.push(`---`, ``)

  
  lines.push(`## 2. MARKETING & OPÉRATIONNEL`, ``)

  if (m.persona?.trim()) {
    lines.push(`### Persona Cible`, ``, m.persona.trim(), ``)
  }
  if (m.swot?.trim()) {
    lines.push(`### Analyse SWOT`, ``, m.swot.trim(), ``)
  }
  if (m.tone?.trim()) {
    lines.push(`### Tone of Voice`, ``, m.tone.trim(), ``)
  }
  if (m.mix?.trim()) {
    lines.push(`### Mix Marketing (4P)`, ``, m.mix.trim(), ``)
  }

  lines.push(`---`, ``)

  
  lines.push(`## 3. LA VOIX DU CLIENT (Live Insights)`, ``)

  if (v.searchIntents?.length) {
    lines.push(
      `### Intentions de Recherche`,
      ``,
      v.searchIntents.map(t => `- ${t}`).join('\n'),
      ``,
    )
  }

  if (v.frictions?.length) {
    lines.push(
      `### Frictions & Objections`,
      ``,
      v.frictions.map(f => `- ⚠️ ${f}`).join('\n'),
      ``,
    )
  }

  if (v.verbatims?.length) {
    lines.push(
      `### Verbatims Clients Positifs`,
      ``,
      v.verbatims.map(vb => `> « ${vb.text} »\n> — *${vb.author}*`).join('\n\n'),
      ``,
    )
  }

  lines.push(
    `---`,
    ``,
    `*Compilé par CodeMyShop Brand OS — ${date}*`,
  )

  return lines.join('\n')
}
