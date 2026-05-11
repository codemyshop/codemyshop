

export interface AvatarDefinition {
  id:           string
  name:         string
  slug:         string
  keywords:     string[]
  rules:        string
  icon:         string
  colorClass:   string
  clientId:     string
  createdAt:    string
  updatedAt:    string
}

const STORAGE_KEY = '_definitions'

export async function readAvatarDefinitions(clientId: string): Promise<AvatarDefinition[]> {
  const storage = useStorage('avatars')
  const key = `${clientId}:${STORAGE_KEY}`
  const data = await storage.getItem<AvatarDefinition[]>(key)
  return data ?? getDefaultDefinitions(clientId)
}

export async function writeAvatarDefinitions(clientId: string, defs: AvatarDefinition[]) {
  const storage = useStorage('avatars')
  const key = `${clientId}:${STORAGE_KEY}`
  await storage.setItem(key, defs)
}

export async function getAvatarDefinition(clientId: string, id: string): Promise<AvatarDefinition | null> {
  const all = await readAvatarDefinitions(clientId)
  return all.find(d => d.id === id) ?? null
}

function getDefaultDefinitions(clientId: string): AvatarDefinition[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'prospect-ecommerce', name: 'Prospect E-commerce', slug: 'prospect-ecommerce',
      keywords: ['prestashop', 'shopify', 'e-commerce', 'boutique', 'migration', 'headless'],
      rules: 'Montrer le calculateur ROI, mettre en avant la performance et les 0% de commission. Ton direct et technique.',
      icon: '\ud83d\uded2', colorClass: 'bg-violet-100 text-violet-700', clientId, createdAt: now, updatedAt: now,
    },
    {
      id: 'client-maintenance', name: 'Client Maintenance', slug: 'client-maintenance',
      keywords: ['maintenance', 'support', 'bug', 'mise \u00e0 jour', 'contrat', 'tma'],
      rules: 'Ton rassurant, montrer la fiabilit\u00e9. Mettre en avant le SLA et le temps de r\u00e9ponse.',
      icon: '\ud83d\udd27', colorClass: 'bg-blue-100 text-blue-700', clientId, createdAt: now, updatedAt: now,
    },
    {
      id: 'agence', name: 'Agence Web', slug: 'agence',
      keywords: ['agence', 'sous-traitance', 'client final', 'white-label', 'prestataire'],
      rules: 'Ton partenaire. Montrer la capacit\u00e9 de sous-traitance et le white-label. Masquer les prix publics.',
      icon: '\ud83c\udfe2', colorClass: 'bg-indigo-100 text-indigo-700', clientId, createdAt: now, updatedAt: now,
    },
    {
      id: 'acheteur-pro', name: 'Acheteur Pro (B2B)', slug: 'acheteur-pro',
      keywords: ['grossiste', 'palette', 'tva', 'volume', 'professionnel', 'chr', 'franco'],
      rules: 'Masquer la TVA, afficher les prix HT, proposer des conditionnements en gros (seaux, cartons). Ton expert et sobre.',
      icon: '\ud83d\udcbc', colorClass: 'bg-green-100 text-green-700', clientId, createdAt: now, updatedAt: now,
    },
  ]
}
