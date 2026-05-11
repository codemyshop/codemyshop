

export interface MegaMenuSubLink {
  label:        string
  href:         string
  

  psId?:        number
  description?: string   
  badge?:       string   
}

export interface MegaMenuColumn {
  title?: string             
  icon?:  string             
  links:  MegaMenuSubLink[]
}

export interface NavItem {
  label:      string
  href?:      string             
  megaMenu?:  MegaMenuColumn[]   
  

  isMegaMenu?: boolean
  highlight?:  boolean           
  external?:   boolean           
  bgColor?:    string            
  textColor?:  string            
  rightAlign?: boolean           
}

export interface LogoConfig {
  src?:   string   
  text?:  string   
  href:   string   
  alt?:   string   
  class?: string   
}

export interface MenuConfig {
  
  clientId: string

  

  domain?: string | string[]

  logo:  LogoConfig
  items: NavItem[]

  
  authLink?: {
    label: string
    href:  string
  }

  
  brand?: {
    primary?:    string   
    background?: string   
  }
}
