/**
 *
 * Service d'infrastructure — Orchestrateur PaaS
 *
 * Manages automatic provisioning of CodeMyShop clients:
 * - Starter: add to existing shared VPS registry
 * - Premium: order a new dedicated VPS via OVH API + Ansible
 *
 * Source of truth: cs_client_vps (DB) via ac_hub facade.
 */

import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { orderClientVPS, waitForVPSReady } from './ovh'
import {
  clientVpsExists,
  countActiveStarterClients,
  createClientVps,
  deactivateClientVps,
  updateClientVps,
} from '~/internal/hub/server/utils/hub'

export interface ProvisionRequest {
  clientId: string
  clientName: string
  offer: 'starter' | 'premium'
  domain: string
  region: string
  email: string
}

export interface ProvisionResult {
  success: boolean
  steps: string[]
  error?: string
  vpsIp?: string
  vpsId?: string
}

const MAX_STARTER_PER_VPS = 15

async function provisionStarter(req: ProvisionRequest): Promise<ProvisionResult> {
  const steps: string[] = []

  if (await clientVpsExists(req.clientId)) {
    return { success: false, steps, error: `Le client '${req.clientId}' existe déjà` }
  }

  const starterCount = await countActiveStarterClients()
  if (starterCount >= MAX_STARTER_PER_VPS) {
    return { success: false, steps, error: `VPS mutualisé plein (${starterCount}/${MAX_STARTER_PER_VPS}). Provisionner un nouveau VPS.` }
  }

  steps.push(`[STARTER] Ajout de '${req.clientId}' au registre mutualisé (${starterCount + 1}/${MAX_STARTER_PER_VPS})`)
  steps.push(`[NGINX] Configuration du domaine ${req.domain} → VPS mutualisé`)
  steps.push(`[SSL] Demande certificat Let's Encrypt pour ${req.domain}`)
  steps.push(`[APP] Création du client '${req.clientId}' dans le monorepo`)
  steps.push(`[DNA] Génération du profil IA par défaut`)
  steps.push(`[DEPLOY] Build et déploiement du site`)

  await createClientVps({
    clientId: req.clientId,
    name: req.clientId,
    label: req.clientName,
    domain: req.domain,
    ip: '',
    purpose: 'production',
    mrr: 0,
    offer: 'starter',
    config: '{}',
  })

  steps.push(`[OK] Client enregistré — en attente de configuration finale`)
  return { success: true, steps }
}

async function provisionPremium(req: ProvisionRequest): Promise<ProvisionResult> {
  const steps: string[] = []

  if (await clientVpsExists(req.clientId)) {
    return { success: false, steps, error: `Le client '${req.clientId}' existe déjà` }
  }

  // Enregistrer immédiatement en status provisioning
  await createClientVps({
    clientId: req.clientId,
    name: req.clientId,
    label: req.clientName,
    domain: req.domain,
    ip: '',
    purpose: 'staging',
    mrr: 0,
    offer: 'premium',
    config: '{}',
  })

  steps.push(`[PREMIUM] Provisioning VPS dédié pour '${req.clientId}' — région ${req.region}`)

  try {
    steps.push(`[OVH] Commande VPS Essential 2-4-80 en région ${req.region}...`)
    const order = await orderClientVPS(req.clientId)
    steps.push(`[OVH] Commande passée — orderId: ${order.orderId}`)

    steps.push(`[OVH] Attente de livraison (estimé 5-15 min)...`)
    const vpsInfo = await waitForVPSReady(order.serviceName)
    steps.push(`[OVH] VPS livré — IP : ${vpsInfo.ip} (${vpsInfo.serviceName})`)

    // Mettre à jour le registre avec l'IP
    await updateClientVps(req.clientId, [
      { kind: 'value', column: 'ip', value: vpsInfo.ip },
      { kind: 'value', column: 'ovh_vps_id', value: vpsInfo.serviceName },
    ])

    steps.push(`[ANSIBLE] Installation stack sur ${vpsInfo.ip}...`)
    try {
      const repoRoot = resolve(process.cwd(), '..')
      const ansibleCmd = [
        'ansible-playbook',
        `${repoRoot}/ansible/deploy-client.yml`,
        '-i', `${vpsInfo.ip},`,
        '-e', `client_id=${req.clientId}`,
        '-e', `domain=${req.domain}`,
        '-e', `offer=${req.offer}`,
        '-e', `admin_email=${req.email}`,
      ].join(' ')

      execSync(ansibleCmd, { timeout: 20 * 60 * 1000, stdio: 'pipe' })
      steps.push(`[ANSIBLE] Stack déployée : Nuxt + PostgreSQL (pgvector) + Redis + Nginx`)
      steps.push(`[SSL] Certificat Let's Encrypt pour ${req.domain}`)
    } catch (ansibleErr: any) {
      steps.push(`[ANSIBLE] ⚠ Erreur Ansible — intervention manuelle nécessaire`)
      steps.push(`[ANSIBLE] ${ansibleErr?.message?.slice(0, 200) || 'Erreur inconnue'}`)
    }

    // Marquer comme actif (production)
    await updateClientVps(req.clientId, [
      { kind: 'value', column: 'purpose', value: 'production' },
    ])

    steps.push(`[DNS] Configure A record : ${req.domain} → ${vpsInfo.ip}`)
    steps.push(`[OK] Client '${req.clientId}' provisionné avec succès`)

    return { success: true, steps, vpsIp: vpsInfo.ip, vpsId: vpsInfo.serviceName }

  } catch (err: any) {
    steps.push(`[ERREUR] ${err?.message || 'Erreur provisioning'}`)
    await deactivateClientVps(req.clientId)
    return { success: false, steps, error: err?.message }
  }
}

export async function provisionClient(req: ProvisionRequest): Promise<ProvisionResult> {
  if (req.offer === 'starter') {
    return provisionStarter(req)
  }
  return provisionPremium(req)
}
