

export interface PromptVariant {
  id:          string    
  version:     string    
  content:     string    
  splitWeight: number    
  metrics:     {
    executions: number
    avgTokens:  number
    avgCost:    number
    avgLatency: number
    positiveRate: number  
  }
}

export interface PromptEntry {
  taskType:     string    
  description:  string
  variants:     PromptVariant[]
  defaultId:    string    
  updatedAt:    string
}

const PROMPT_REGISTRY: Record<string, PromptEntry> = {

  broadcast: {
    taskType: 'broadcast',
    description: 'Génération de messages marketing multi-canal',
    defaultId: 'broadcast-v1',
    updatedAt: '2026-03-16',
    variants: [
      {
        id: 'broadcast-v1',
        version: '1.0',
        splitWeight: 100,
        content: `Tu es un expert copywriter email marketing.
Ton imposé : {tone}.
Génère un message structuré en JSON :
{"subject": "objet max 60 chars", "preview": "aperçu max 90 chars", "body": "3 paragraphes", "cta": "max 5 mots"}`,
        metrics: { executions: 0, avgTokens: 0, avgCost: 0, avgLatency: 0, positiveRate: 0 },
      },
    ],
  },

  nurturing: {
    taskType: 'nurturing',
    description: 'Séquences automatisées multi-canal',
    defaultId: 'nurturing-v1',
    updatedAt: '2026-03-16',
    variants: [
      {
        id: 'nurturing-v1',
        version: '1.0',
        splitWeight: 100,
        content: `Tu es un expert en séquences de nurturing e-commerce.
Génère {stepCount} messages. Alterne email/whatsapp si mix canaux.
JSON : {"steps": [{"dayOffset": N, "channel": "email"|"whatsapp", "subject": "...", "body": "...", "goal": "..."}]}`,
        metrics: { executions: 0, avgTokens: 0, avgCost: 0, avgLatency: 0, positiveRate: 0 },
      },
    ],
  },

  transcreation: {
    taskType: 'transcreation',
    description: 'Adaptation culturelle multilingue',
    defaultId: 'transcreation-v1',
    updatedAt: '2026-03-16',
    variants: [
      {
        id: 'transcreation-v1',
        version: '1.0',
        splitWeight: 100,
        content: `Tu es un expert en transcréation marketing multilingue.
Adapte le MESSAGE (pas juste les mots) à la psychologie d'achat du marché cible.
JSON : {"transcreated": "...", "culturalNotes": [...], "adaptations": [...]}`,
        metrics: { executions: 0, avgTokens: 0, avgCost: 0, avgLatency: 0, positiveRate: 0 },
      },
    ],
  },

  youtube: {
    taskType: 'youtube',
    description: 'Storyboards vidéo data-driven',
    defaultId: 'youtube-v1',
    updatedAt: '2026-03-16',
    variants: [
      {
        id: 'youtube-v1',
        version: '1.0',
        splitWeight: 100,
        content: `Tu es un producteur YouTube B2B avec personnages 3D Pixar.
5 plans : Hook 5s → Développement chiffré → CTA Simulateur.
JSON : {"title":"...","scenes":[{"sceneNumber":N,"voiceOver":"...","visual_Prompt_Pixar3D":"3D Pixar style, ..., 16:9","bRoll_Text":"..."}],"cta":"..."}`,
        metrics: { executions: 0, avgTokens: 0, avgCost: 0, avgLatency: 0, positiveRate: 0 },
      },
    ],
  },

  'growth-advice': {
    taskType: 'growth-advice',
    description: 'Conseils stratégiques de croissance',
    defaultId: 'growth-v1',
    updatedAt: '2026-03-16',
    variants: [
      {
        id: 'growth-v1',
        version: '1.0',
        splitWeight: 100,
        content: `Tu es un consultant en croissance e-commerce.
Propose 3 actions pragmatiques utilisant les outils CodeMyShop.
JSON : {"summary":"...","actions":[{"title":"...","channel":"...","impact":"...","detail":"..."}]}`,
        metrics: { executions: 0, avgTokens: 0, avgCost: 0, avgLatency: 0, positiveRate: 0 },
      },
    ],
  },

  'feedback-to-prompt': {
    taskType: 'feedback-to-prompt',
    description: 'Traduction feedback → specs techniques',
    defaultId: 'f2p-v1',
    updatedAt: '2026-03-16',
    variants: [
      {
        id: 'f2p-v1',
        version: '1.0',
        splitWeight: 100,
        content: `Tu es un Product Manager technique expert Nuxt 3 / Nitro / PrestaShop.
Traduis la demande client en prompt Claude Code avec /plan et fichiers ciblés.
JSON : {"aiClassification":"...","technicalPrompt":"...","estimatedComplexity":"..."}`,
        metrics: { executions: 0, avgTokens: 0, avgCost: 0, avgLatency: 0, positiveRate: 0 },
      },
    ],
  },
}

export function resolvePrompt(taskType: string): { prompt: string; variantId: string } | null {
  const entry = PROMPT_REGISTRY[taskType]
  if (!entry) return null

  
  const variants = entry.variants.filter(v => v.splitWeight > 0)
  if (!variants.length) return null

  const totalWeight = variants.reduce((s, v) => s + v.splitWeight, 0)
  let random = Math.random() * totalWeight
  for (const v of variants) {
    random -= v.splitWeight
    if (random <= 0) return { prompt: v.content, variantId: v.id }
  }

  
  const def = entry.variants.find(v => v.id === entry.defaultId) ?? variants[0]
  return { prompt: def.content, variantId: def.id }
}

export function recordPromptMetrics(variantId: string, metrics: {
  tokens: number; cost: number; latencyMs: number; positive: boolean
}) {
  for (const entry of Object.values(PROMPT_REGISTRY)) {
    const variant = entry.variants.find(v => v.id === variantId)
    if (!variant) continue

    const m = variant.metrics
    const n = m.executions + 1
    m.avgTokens   = (m.avgTokens * m.executions + metrics.tokens) / n
    m.avgCost     = (m.avgCost * m.executions + metrics.cost) / n
    m.avgLatency  = (m.avgLatency * m.executions + metrics.latencyMs) / n
    m.positiveRate = (m.positiveRate * m.executions + (metrics.positive ? 1 : 0)) / n
    m.executions  = n
    break
  }
}

export function getPromptRegistry(): Record<string, PromptEntry> {
  return PROMPT_REGISTRY
}
