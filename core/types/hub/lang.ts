

export interface HubLang {
  id_lang: number
  iso_code: string
  name: string
  
  is_default: boolean
  active: boolean
}

export interface HubLangListResponse {
  langs: HubLang[]
  default_id: number
}
