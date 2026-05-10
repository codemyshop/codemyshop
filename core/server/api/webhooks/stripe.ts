/**
 *
 * POST /api/webhooks/stripe
 *
 * Webhook Stripe — Orchestrateur PaaS CodeMyShop.
 *
 * Flow triggered by checkout.session.completed:
 * 1. Retrieve the client from the Stripe session
 * 2. Create an isolated Matomo project
 * 3. Order a dedicated OVH VPS
 * 4. Wait for the VPS IP
 * 5. Run the Ansible playbook (Docker, clone, .env, up)
 * 6. Register the client in DB (cs_client_vps)
 *
 * Variables d'environnement requises :
 * STRIPE_SECRET_KEY       — Stripe secret key
 * STRIPE_WEBHOOK_SECRET   — Webhook secret (signature verification)
 * GIT_DEPLOY_TOKEN        — Git token for cloning the private repo
 *
 * SECURITY: Stripe signature is verified before any processing.
 */
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'

const execAsync = promisify(exec)

export default defineEventHandler(async (event) => {
  const stripeSecretKey    = process.env.STRIPE_SECRET_KEY
  const webhookSecret      = process.env.STRIPE_WEBHOOK_SECRET
  const gitDeployToken     = process.env.GIT_DEPLOY_TOKEN

  if (!stripeSecretKey || !webhookSecret) {
    throw createError({ statusCode: 500, message: 'Stripe not configured' })
  }

  // ── 1. Vérifier la signature Stripe ───────────────────────────────────
  let stripeEvent: any
  try {
    const Stripe = require('stripe')
    const stripe = new Stripe(stripeSecretKey)
    const body = await readRawBody(event)
    const sig  = getHeader(event, 'stripe-signature')

    if (!body || !sig) {
      throw createError({ statusCode: 400, message: 'Missing body or signature' })
    }

    stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err?.message)
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  // ── 2. Traiter uniquement checkout.session.completed ──────────────────
  if (stripeEvent.type !== 'checkout.session.completed') {
    return { received: true, ignored: true }
  }

  const session = stripeEvent.data.object
  const clientName  = session.metadata?.client_name  ?? session.client_reference_id ?? 'unknown'
  const clientEmail = session.customer_email          ?? session.metadata?.email ?? ''
  const domain      = session.metadata?.domain        ?? `${clientName}.codemyshop.fr`

  console.log(`[orchestrator] ═══ Nouveau client: ${clientName} (${domain}) ═══`)

  // Lancer le provisioning en asynchrone (ne pas bloquer la réponse Stripe)
  // Stripe attend une réponse 200 rapide, le provisioning prend ~15 min
  setImmediate(() => provisionClient(clientName, domain, clientEmail, gitDeployToken ?? ''))

  return { received: true, clientName, provisioning: 'started' }
})

// ── Orchestrateur de provisioning ─────────────────────────────────────────

async function provisionClient(
  clientName: string,
  domain: string,
  email: string,
  gitToken: string
) {
  try {
    // Étape 1 — Créer le projet Matomo
    console.log(`[orchestrator] 1/4 — Création projet Matomo...`)
    const { createProject } = await import('../../services/matomoAdmin')
    const matomo = await createProject(clientName)
    console.log(`[orchestrator]   ✓ Matomo project: ${matomo.projectId}`)

    // Étape 2 — Commander le VPS OVH
    console.log(`[orchestrator] 2/4 — Commande VPS OVH...`)
    const { orderClientVPS, waitForVPSReady } = await import('../../services/ovh')
    const order = await orderClientVPS(clientName)
    console.log(`[orchestrator]   ✓ VPS commandé: orderId ${order.orderId}`)

    // Étape 3 — Attendre que le VPS soit prêt
    console.log(`[orchestrator] 3/4 — Attente provisioning VPS...`)
    const vps = await waitForVPSReady(order.serviceName)
    console.log(`[orchestrator]   ✓ VPS prêt: ${vps.ip}`)

    // Étape 4 — Lancer Ansible
    console.log(`[orchestrator] 4/4 — Lancement playbook Ansible...`)
    const playbookPath = resolve(process.cwd(), '../ansible/deploy-client.yml')
    const extraVars = [
      `client_name=${clientName}`,
      `domain=${domain}`,
      `matomo_key=${matomo.apiToken}`,
      `git_deploy_token=${gitToken}`,
      `admin_email=${email}`,
    ].join(' ')

    const cmd = `ansible-playbook -i ${vps.ip}, ${playbookPath} --extra-vars "${extraVars}" --ssh-extra-args="-o StrictHostKeyChecking=no"`

    const { stdout, stderr } = await execAsync(cmd, { timeout: 20 * 60 * 1000 })
    console.log(`[orchestrator]   ✓ Ansible terminé`)
    if (stderr) console.warn(`[orchestrator]   Ansible stderr: ${stderr.slice(0, 500)}`)

    // Étape 5 — Enregistrer le client en DB (cs_client_vps via façade ac_hub)
    console.log(`[orchestrator] Enregistrement en DB...`)
    const { createClientVps } = await import('~/internal/hub/server/utils/hub')
    const config = JSON.stringify({
      analytics: {
        provider: 'matomo-centralized',
        host: process.env.MATOMO_HOST ?? 'https://analytics.codemyshop.fr',
        projectId: matomo.projectId,
        projectApiKey: matomo.apiToken,
        sovereignData: true,
      },
    })

    await createClientVps({
      clientId: clientName,
      name: clientName,
      label: clientName,
      domain,
      ip: vps.ip,
      ovhVpsId: vps.serviceName,
      offer: 'premium',
      purpose: 'production',
      mrr: 0,
      config,
      hasNuxt: 1,
      hasPrestashop: 1,
    })

    console.log(`[orchestrator] ═══ ✅ ${clientName} déployé — ${domain} @ ${vps.ip} ═══`)

  } catch (err: any) {
    console.error(`[orchestrator] ❌ Échec provisioning ${clientName}:`, err?.message || err)
  }
}
