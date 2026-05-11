

export type AcHubAvatarType =
  | 'prospect-ecommerce'  
  | 'client-maintenance'  
  | 'agence'              
  | 'entrepreneur'        

export type GenericAvatarType =
  | 'acheteur-pro'        
  | 'particulier'         
  | 'revendeur'           
  | 'unknown'             

export type AvatarType = AcHubAvatarType | GenericAvatarType

export interface VisitorAvatar {
  type:        AvatarType
  label:       string        
  confidence:  number        
  signals:     string[]      
  computedAt:  string        
  clientId:    string        
  visitorId:   string        
}

export interface SectionVisibilityRule {
  
  avatars: AvatarType[]
  

  mode:    'show' | 'hide'
  
  label?:  string
}

export interface VisitorSignals {
  pagesViewed?:   string[]   
  utmSource?:     string     
  formSubject?:   string     
  formMessageHash?: string   
}
