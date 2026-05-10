/**
 * Universal AI wrapper — Anthropic claude-sonnet-4-6 in production, deterministic stub in dev/demo.
 *
 * Usage :
 *   const result = await callAI(systemPrompt, userPrompt)
 *
 * Variables d'environnement requises en prod :
 *   ANTHROPIC_API_KEY=sk-ant-...
 */

interface AnthropicMessage {
  role:    'user' | 'assistant'
  content: string
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>
}

/**
 * Calls the Anthropic API (claude-sonnet-4-6) with a system prompt + user message.
 * Returns the raw text of the response.
 *
 * If ANTHROPIC_API_KEY is missing → stub mode (deterministic fake response).
 */
export async function callAI(
  systemPrompt: string,
  userPrompt:   string,
): Promise<string> {
  const config = useRuntimeConfig()

  // ── Mode stub / démo ──────────────────────────────────────────────────────
  if (!config.anthropicApiKey) {
    console.warn('[AI] ANTHROPIC_API_KEY absent — mode stub activé')
    return generateStubResponse(systemPrompt, userPrompt)
  }

  // ── Appel Anthropic (centralisé) ───────────────────────────────────────────
  const result = await callAnthropicRaw({
    apiKey: config.anthropicApiKey as string,
    systemPrompt,
    userPrompt,
    maxTokens: 1024,
  })

  return result.content
}

// ── Stub déterministe ──────────────────────────────────────────────────────

/**
 * Generates a consistent fake response based on keywords in the prompt.
 * Deterministic: same inputs → same output. No randomness.
 */
function generateStubResponse(system: string, user: string): string {
  const combined = (system + ' ' + user).toLowerCase()

  // Classification avatar — déclenché UNIQUEMENT par le classificateur de visiteurs
  if (system.includes('classificateur de visiteurs') || system.includes('classifie ce visiteur')) {
    if (combined.includes('prestashop') || combined.includes('e-commerce') || combined.includes('boutique')) {
      return JSON.stringify({ type: 'prospect-ecommerce', label: 'Prospect E-commerce', confidence: 0.87, signals: ['Mots-clés PrestaShop détectés', 'Contexte e-commerce'] })
    }
    if (combined.includes('maintenance') || combined.includes('contrat') || combined.includes('support')) {
      return JSON.stringify({ type: 'client-maintenance', label: 'Client Maintenance', confidence: 0.82, signals: ['Mots-clés maintenance/support'] })
    }
    if (combined.includes('agence') || combined.includes('sous-traitan') || combined.includes('client final')) {
      return JSON.stringify({ type: 'agence', label: 'Agence', confidence: 0.79, signals: ['Mots-clés agence web'] })
    }
    if (combined.includes('projet') || combined.includes('créer') || combined.includes('lancer') || combined.includes('startup')) {
      return JSON.stringify({ type: 'entrepreneur', label: 'Entrepreneur', confidence: 0.75, signals: ['Mots-clés création/lancement'] })
    }
    return JSON.stringify({ type: 'unknown', label: 'Inconnu', confidence: 0.3, signals: ['Signaux insuffisants'] })
  }

  // Newsletter
  if (system.includes('newsletter') || system.includes('email')) {
    return '[STUB] Objet généré par l\'IA · Corps de l\'email factice pour démo.'
  }

  return '[STUB] Réponse IA factice — activez ANTHROPIC_API_KEY pour la prod.'
}
