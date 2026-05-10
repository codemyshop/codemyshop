/**
 *
 * Matomo Admin service — Management of client projects.
 *
 * Use the centralized Matomo API
 * to create an isolated project per client during onboarding.
 *
 * Variables d'environnement requises :
 * MATOMO_PERSONAL_API_KEY — Matomo admin API key (not the project key)
 * MATOMO_HOST — URL of the centralized Matomo instance
 */

interface MatomoProject {
  projectId: string
  apiToken: string     // NUXT_PUBLIC_MATOMO_KEY du client
  projectName: string
}

/**
 * Create a new isolated Matomo project for a client.
 *
 * @param clientName - Identifiant unique du client (ex: "example-shop")
 * @returns projectId + apiToken (clé publique du projet)
 */
export async function createProject(clientName: string): Promise<MatomoProject> {
  const host   = process.env.MATOMO_HOST ?? 'https://analytics.codemyshop.fr'
  const apiKey = process.env.MATOMO_PERSONAL_API_KEY

  if (!apiKey) {
    throw new Error('[matomo-admin] MATOMO_PERSONAL_API_KEY non définie')
  }

  try {
    // Créer le projet via l'API Matomo
    const response = await $fetch<any>(`${host}/api/projects/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        name: clientName,
        is_demo: false,
      },
      timeout: 15000,
    })

    const projectId = String(response.id)
    const apiToken  = response.api_token

    if (!projectId || !apiToken) {
      throw new Error('Réponse Matomo invalide — projectId ou api_token manquant')
    }

    console.log(`[matomo-admin] Projet créé : ${clientName} — id: ${projectId}`)

    return {
      projectId,
      apiToken,
      projectName: clientName,
    }
  } catch (err: any) {
    console.error(`[matomo-admin] Erreur création projet ${clientName}:`, err?.message || err)
    throw new Error(`Matomo project creation failed: ${err?.message}`)
  }
}
