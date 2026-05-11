

interface MatomoProject {
  projectId: string
  apiToken: string     
  projectName: string
}

export async function createProject(clientName: string): Promise<MatomoProject> {
  const host   = process.env.MATOMO_HOST ?? 'https://analytics.codemyshop.fr'
  const apiKey = process.env.MATOMO_PERSONAL_API_KEY

  if (!apiKey) {
    throw new Error('[matomo-admin] MATOMO_PERSONAL_API_KEY non définie')
  }

  try {
    
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
