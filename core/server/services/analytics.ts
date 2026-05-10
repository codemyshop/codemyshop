/**
 *
 * Server-side analytics service — centralized Matomo.
 *
 * Architecture: one Matomo instance on the master VPS,
 * one isolated project per tenant (data siloed).
 *
 * This service resolves the tenant's Matomo configuration from cs_client_vps (DB)
 * and exposes methods to capture server-side events
 * (orders, conversions) and retrieve insights.
 *
 * Non-blocking: if Matomo is down, calls are ignored.
 */

interface AnalyticsConfig {
  provider: string
  host: string
  projectId: string
  projectApiKey: string
  sovereignData: boolean
}

async function getClientAnalytics(clientId: string): Promise<AnalyticsConfig | null> {
  const { getClientVpsConfigJson } = await import('~/internal/hub/server/utils/hub')
  const json = await getClientVpsConfigJson(clientId)
  if (!json) return null
  try {
    const parsed = JSON.parse(json)
    return parsed?.analytics ?? null
  } catch {
    return null
  }
}

/**
 * Captures a server-side event via the Matomo API.
 * Used for conversions, orders, etc.
 */
export async function captureServerEvent(
  clientId: string,
  event: string,
  distinctId: string,
  properties?: Record<string, any>
): Promise<void> {
  const config = await getClientAnalytics(clientId)
  if (!config?.projectApiKey || !config?.host) return

  try {
    await $fetch(`${config.host}/capture/`, {
      method: 'POST',
      body: {
        api_key: config.projectApiKey,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: 'codemyshop-server',
          tenant: clientId,
        },
      },
      timeout: 5000,
    })
  } catch {
    // Matomo down = on continue silencieusement
  }
}

/**
 * Retrieves insights from the Matomo API.
 */
export async function getInsights(
  clientId: string,
  dateRange?: { from: string; to: string }
): Promise<any> {
  const config = await getClientAnalytics(clientId)
  if (!config?.projectApiKey || !config?.host || !config?.projectId) return null

  try {
    const data = await $fetch(`${config.host}/api/projects/${config.projectId}/insights/`, {
      headers: {
        Authorization: `Bearer ${config.projectApiKey}`,
      },
      query: dateRange ? { date_from: dateRange.from, date_to: dateRange.to } : undefined,
      timeout: 10000,
    })
    return data
  } catch {
    return null
  }
}
