/**
 *
 * OVH service — Ordering and provisioning of dedicated VPS.
 *
 * Each client gets a sovereign French VPS.
 * This service uses the OVH API to order, monitor, and
 * retrieve the public IP of the VPS once provisioned.
 *
 * Variables d'environnement requises :
 *   OVH_APP_KEY, OVH_APP_SECRET, OVH_CONSUMER_KEY, OVH_REGION
 */

interface VPSOrderResult {
  serviceName: string
  orderId: number
}

interface VPSInfo {
  serviceName: string
  ip: string
  status: string
}

/**
 * Create an authenticated OVH client.
 */
function createOvhClient() {
  // Import dynamique pour ne pas bloquer si le package n'est pas installé
  const Ovh = require('ovh')
  return new Ovh({
    appKey:      process.env.OVH_APP_KEY,
    appSecret:   process.env.OVH_APP_SECRET,
    consumerKey: process.env.OVH_CONSUMER_KEY,
    endpoint:    process.env.OVH_REGION ?? 'ovh-eu',
  })
}

/**
 * Order a VPS from OVH for a new client.
 *
 * @param clientName - Identifiant du client (ex: "example-shop")
 * @returns serviceName et orderId
 */
export async function orderClientVPS(clientName: string): Promise<VPSOrderResult> {
  const ovh = createOvhClient()

  try {
    // 1. Récupérer les offres VPS disponibles
    const catalog = await ovh.requestPromised('GET', '/order/catalog/public/vps', {
      ovhSubsidiary: 'FR',
    })

    // VPS Essential 2 vCPU, 4GB RAM, 80GB SSD — ~12.50€/mois
    const TARGET_PLAN = 'vps-essential-2-4-80'
    const plan = catalog.plans?.find((p: any) => p.planCode === TARGET_PLAN)

    if (!plan) {
      throw new Error(`Plan ${TARGET_PLAN} non trouvé dans le catalogue OVH`)
    }

    console.log(`[ovh] Plan sélectionné : ${plan.planCode} (${plan.invoiceName})`)

    // 2. Créer la commande
    const cart = await ovh.requestPromised('POST', '/order/cart', {
      ovhSubsidiary: 'FR',
      description: `VPS CodeMyShop — ${clientName}`,
    })

    await ovh.requestPromised('POST', `/order/cart/${cart.cartId}/assign`)

    // Ajouter le VPS au panier
    const item = await ovh.requestPromised('POST', `/order/cart/${cart.cartId}/vps`, {
      planCode: plan.planCode,
      duration: 'P1M',
      pricingMode: 'default',
      quantity: 1,
    })

    // Configuration : Ubuntu 22.04, datacenter France (GRA/RBX/SBG)
    const configs = await ovh.requestPromised(
      'GET',
      `/order/cart/${cart.cartId}/item/${item.itemId}/requiredConfiguration`
    )

    for (const cfg of configs) {
      if (cfg.label === 'vps_os') {
        await ovh.requestPromised(
          'POST',
          `/order/cart/${cart.cartId}/item/${item.itemId}/configuration`,
          { label: 'vps_os', value: 'ubuntu2404-server_64.Ubuntu_24.04' }
        )
      }
      if (cfg.label === 'vps_datacenter') {
        await ovh.requestPromised(
          'POST',
          `/order/cart/${cart.cartId}/item/${item.itemId}/configuration`,
          { label: 'vps_datacenter', value: 'GRA' }  // Gravelines, France
        )
      }
    }

    // 3. Valider et payer la commande (paiement par défaut du compte OVH)
    const order = await ovh.requestPromised(
      'POST',
      `/order/cart/${cart.cartId}/checkout`,
      { autoPayWithPreferredPaymentMethod: true }
    )

    console.log(`[ovh] VPS commandé pour ${clientName} — orderId: ${order.orderId}`)

    return {
      serviceName: `vps-${clientName}`,
      orderId: order.orderId,
    }
  } catch (err: any) {
    console.error(`[ovh] Erreur commande VPS pour ${clientName}:`, err?.message || err)
    throw new Error(`OVH VPS order failed: ${err?.message}`)
  }
}

/**
 * Poll the OVH API until the VPS is active and returns its public IP.
 *
 * @param serviceName - Nom du service VPS
 * @param maxWaitMs - Timeout max (défaut 15 minutes)
 * @param pollIntervalMs - Intervalle de polling (défaut 30 secondes)
 */
export async function waitForVPSReady(
  serviceName: string,
  maxWaitMs = 15 * 60 * 1000,
  pollIntervalMs = 30_000
): Promise<VPSInfo> {
  const ovh = createOvhClient()
  const start = Date.now()

  console.log(`[ovh] Attente provisioning VPS ${serviceName}...`)

  while (Date.now() - start < maxWaitMs) {
    try {
      // Lister les VPS du compte
      const vpsList: string[] = await ovh.requestPromised('GET', '/vps')
      const match = vpsList.find(v => v.includes(serviceName) || v === serviceName)

      if (match) {
        const info = await ovh.requestPromised('GET', `/vps/${match}`)

        if (info.state === 'running') {
          // Récupérer l'IP publique
          const ips: string[] = await ovh.requestPromised('GET', `/vps/${match}/ips`)
          const ipv4 = ips.find((ip: string) => !ip.includes(':'))

          if (ipv4) {
            console.log(`[ovh] VPS ${match} prêt — IP: ${ipv4}`)
            return {
              serviceName: match,
              ip: ipv4,
              status: 'running',
            }
          }
        }
      }
    } catch {
      // VPS pas encore provisionné, on continue de poll
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(`[ovh] Timeout: VPS ${serviceName} non prêt après ${maxWaitMs / 60000} min`)
}
