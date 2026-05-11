

export type ModuleEdition = 'community' | 'enterprise' | 'custom' | 'internal'

export type ModulePack =
  | 'base'              
  | 'ai'                
  | 'data'              
  | 'seo'               
  | 'banking'           
  | 'vertical-food'     
  | 'vertical-vape'
  | 'vertical-fashion'
  | 'vertical-jewelry'
  | 'misc'              

export type Tier = 'community' | 'starter' | 'growth' | 'pro' | 'custom'

export interface ModuleHooks {
  
  exposes?: string[]
  
  consumes?: string[]
}

export interface ModulePricing {
  
  included_in_tiers: Tier[]
  
  addon?: {
    stripe_price_id: string
    monthly_eur: number
    label: string
  }
}

export interface ModuleManifest {
  
  id: string

  
  edition: ModuleEdition

  
  pack?: ModulePack

  
  requires?: string[]

  
  hooks?: ModuleHooks

  
  pricing?: ModulePricing

  
  install?: (ctx: ModuleContext) => Promise<void>

  
  uninstall?: (ctx: ModuleContext) => Promise<void>
}

export interface ModuleContext {
  tenantId: string
  tier: Tier
  edition: ModuleEdition
}

export function defineModule(m: ModuleManifest): ModuleManifest {
  return m
}
