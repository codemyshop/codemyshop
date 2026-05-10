/**
 *
 * Versioned prompt registry with A/B testing.
 *
 * Architecture Flywheel :
 * 1. Prompts are centralized here (never on the distributed nodes)
 * 2. Each prompt has variants (A/B) with a split rate
 * 3. Telemetry (tokens, cost, quality) is collected per variant
 * 4. Anonymized feedback from the distributed nodes refines the prompts
 *
 * How feedback improves prompts:
 * - A distributed node sends its metrics (latency, tokens, satisfaction)
 * - The hub aggregates by prompt_id + variant
 * - We identify prompts that consume too many tokens or generate
 * unsatisfactory results (negative feedback)
 * - We create a new optimized variant and increase its split
 * - After 100 executions, the best variant becomes "default"
 */

export interface PromptVariant {
  id:          string    // ex: 'broadcast-v2a'
  version:     string    // ex: '2.0a'
  content:     string    // le prompt système
  splitWeight: number    // 0-100 (% de trafic)
  metrics:     {
    executions: number
    avgTokens:  number
    avgCost:    number
    avgLatency: number
    positiveRate: number  // 0-1 (satisfaction)
  }
}

export interface PromptEntry {
  taskType:     string    // ex: 'broadcast', 'nurturing'
  description:  string
  variants:     PromptVariant[]
  defaultId:    string    // variante par défaut
  updatedAt:    string
}

// ── Registre des prompts (source de vérité) ──────────────────────────────────

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

// ── API publique ──────────────────────────────────────────────────────────────

/** Résout le prompt à utiliser pour un taskType (avec A/B split) */
export function resolvePrompt(taskType: string): { prompt: string; variantId: string } | null {
  const entry = PROMPT_REGISTRY[taskType]
  if (!entry) return null

  // A/B split: weighted random selection
  const variants = entry.variants.filter(v => v.splitWeight > 0)
  if (!variants.length) return null

  const totalWeight = variants.reduce((s, v) => s + v.splitWeight, 0)
  let random = Math.random() * totalWeight
  for (const v of variants) {
    random -= v.splitWeight
    if (random <= 0) return { prompt: v.content, variantId: v.id }
  }

  // Fallback : default
  const def = entry.variants.find(v => v.id === entry.defaultId) ?? variants[0]
  return { prompt: def.content, variantId: def.id }
}

/** Records the metrics of an execution (for the feedback loop) */
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

/** Returns the entire registry (for the admin dashboard) */
export function getPromptRegistry(): Record<string, PromptEntry> {
  return PROMPT_REGISTRY
}
