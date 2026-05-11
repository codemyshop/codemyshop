

export interface ScopeSpec {
  slug: string         
  label: string        
  table: string        
  column: string       
  idCols: string[]     
  labelSql?: string    
  domain?: string      
  category: 'i18n-hub' | 'catalog' | 'cms' | 'seo' | 'config' | 'features'
  multiline?: boolean  
  html?: boolean       
  

  clientScope?: {
    masterTable: string
    masterIdCol: string
    parentTable?: string
    parentIdCol?: string
  }
  

  dedupe?: 'source'
}

export const STATIC_SCOPES: ScopeSpec[] = [
  
  { slug: 'ps_product_lang:name',              label: 'Produits — Nom',              table: 'ps_product_lang',   column: 'name',              idCols: ['id_product', 'id_shop'],    category: 'catalog' },
  { slug: 'ps_product_lang:description_short', label: 'Produits — Description courte', table: 'ps_product_lang', column: 'description_short', idCols: ['id_product', 'id_shop'],    category: 'catalog', multiline: true, html: true },
  { slug: 'ps_product_lang:description',       label: 'Produits — Description',       table: 'ps_product_lang',  column: 'description',       idCols: ['id_product', 'id_shop'],    category: 'catalog', multiline: true, html: true },
  { slug: 'ps_product_lang:meta_title',        label: 'Produits — Meta title',        table: 'ps_product_lang',  column: 'meta_title',        idCols: ['id_product', 'id_shop'],    category: 'seo' },
  { slug: 'ps_product_lang:meta_description',  label: 'Produits — Meta description',  table: 'ps_product_lang',  column: 'meta_description',  idCols: ['id_product', 'id_shop'],    category: 'seo',     multiline: true },
  { slug: 'ps_product_lang:link_rewrite',      label: 'Produits — URL (slug)',        table: 'ps_product_lang',  column: 'link_rewrite',      idCols: ['id_product', 'id_shop'],    category: 'seo' },

  { slug: 'ps_category_lang:name',             label: 'Catégories — Nom',             table: 'ps_category_lang', column: 'name',              idCols: ['id_category', 'id_shop'],   category: 'catalog' },
  { slug: 'ps_category_lang:description',      label: 'Catégories — Description',     table: 'ps_category_lang', column: 'description',       idCols: ['id_category', 'id_shop'],   category: 'catalog', multiline: true, html: true },
  { slug: 'ps_category_lang:meta_title',       label: 'Catégories — Meta title',      table: 'ps_category_lang', column: 'meta_title',        idCols: ['id_category', 'id_shop'],   category: 'seo' },
  { slug: 'ps_category_lang:meta_description', label: 'Catégories — Meta description', table: 'ps_category_lang', column: 'meta_description', idCols: ['id_category', 'id_shop'],   category: 'seo', multiline: true },
  { slug: 'ps_category_lang:link_rewrite',     label: 'Catégories — URL (slug)',      table: 'ps_category_lang', column: 'link_rewrite',      idCols: ['id_category', 'id_shop'],   category: 'seo' },

  
  { slug: 'ps_cms_lang:meta_title',            label: 'CMS — Meta title',             table: 'ps_cms_lang',      column: 'meta_title',        idCols: ['id_cms', 'id_shop'],        category: 'cms' },
  { slug: 'ps_cms_lang:meta_description',      label: 'CMS — Meta description',       table: 'ps_cms_lang',      column: 'meta_description',  idCols: ['id_cms', 'id_shop'],        category: 'cms', multiline: true },
  { slug: 'ps_cms_lang:content',               label: 'CMS — Contenu',                table: 'ps_cms_lang',      column: 'content',           idCols: ['id_cms', 'id_shop'],        category: 'cms', multiline: true, html: true },
  { slug: 'ps_cms_lang:link_rewrite',          label: 'CMS — URL (slug)',             table: 'ps_cms_lang',      column: 'link_rewrite',      idCols: ['id_cms', 'id_shop'],        category: 'seo' },
  { slug: 'ps_cms_category_lang:link_rewrite', label: 'CMS Catégories — URL (slug)',  table: 'ps_cms_category_lang', column: 'link_rewrite',  idCols: ['id_cms_category', 'id_shop'], category: 'seo' },

  { slug: 'ps_cms_category_lang:name',         label: 'CMS Catégories — Nom',         table: 'ps_cms_category_lang', column: 'name',          idCols: ['id_cms_category', 'id_shop'], category: 'cms' },
  { slug: 'ps_cms_category_lang:description',  label: 'CMS Catégories — Description', table: 'ps_cms_category_lang', column: 'description',   idCols: ['id_cms_category', 'id_shop'], category: 'cms', multiline: true, html: true },

  
  { slug: 'ps_meta_lang:title',                label: 'Meta pages — Title',           table: 'ps_meta_lang',     column: 'title',             idCols: ['id_meta', 'id_shop'],       category: 'seo' },
  { slug: 'ps_meta_lang:description',          label: 'Meta pages — Description',     table: 'ps_meta_lang',     column: 'description',       idCols: ['id_meta', 'id_shop'],       category: 'seo', multiline: true },

  
  { slug: 'ps_attribute_lang:name',            label: 'Attributs — Valeur',           table: 'ps_attribute_lang', column: 'name',             idCols: ['id_attribute'],             category: 'features' },
  { slug: 'ps_attribute_group_lang:name',      label: 'Groupes d\'attributs — Nom',   table: 'ps_attribute_group_lang', column: 'name',       idCols: ['id_attribute_group'],       category: 'features' },
  { slug: 'ps_attribute_group_lang:public_name', label: 'Groupes d\'attributs — Nom public', table: 'ps_attribute_group_lang', column: 'public_name', idCols: ['id_attribute_group'], category: 'features' },
  { slug: 'ps_feature_lang:name',              label: 'Caractéristiques — Nom',       table: 'ps_feature_lang',  column: 'name',              idCols: ['id_feature'],               category: 'features' },
  { slug: 'ps_feature_value_lang:value',       label: 'Caractéristiques — Valeur',    table: 'ps_feature_value_lang', column: 'value',        idCols: ['id_feature_value'],         category: 'features' },

  
  { slug: 'ps_configuration_lang:value',       label: 'Configuration — Valeur',       table: 'ps_configuration_lang', column: 'value',        idCols: ['id_configuration'],         category: 'config', multiline: true },

  
  { slug: 'cs_megamenu_lang:label',         label: 'Megamenu — Libellé',           table: 'cs_megamenu_lang', column: 'label',        idCols: ['id_megamenu'],                category: 'cms', clientScope: { masterTable: 'cs_megamenu', masterIdCol: 'id_megamenu' } },
  { slug: 'cs_megamenu_lang:description',   label: 'Megamenu — Tagline',           table: 'cs_megamenu_lang', column: 'description',  idCols: ['id_megamenu'],                category: 'cms', multiline: true, clientScope: { masterTable: 'cs_megamenu', masterIdCol: 'id_megamenu' } },
  { slug: 'cs_megamenu_lang:badge',         label: 'Megamenu — Badge',             table: 'cs_megamenu_lang', column: 'badge',        idCols: ['id_megamenu'],                category: 'cms', clientScope: { masterTable: 'cs_megamenu', masterIdCol: 'id_megamenu' } },
  { slug: 'cs_megamenu_lang:group_title',   label: 'Megamenu — Titre de colonne',  table: 'cs_megamenu_lang', column: 'group_title',  idCols: ['id_megamenu'],                category: 'cms', clientScope: { masterTable: 'cs_megamenu', masterIdCol: 'id_megamenu' } },

{ slug: 'cs_footer_lang:column_title',         label: 'Footer — Titre colonne',    table: 'cs_footer_lang', column: 'column_title', idCols: ['id_footer'], category: 'cms', clientScope: { masterTable: 'cs_footer', masterIdCol: 'id_footer' }, dedupe: 'source' },
  { slug: 'cs_footer_lang:link_label',           label: 'Footer — Libellé lien',     table: 'cs_footer_lang', column: 'link_label',   idCols: ['id_footer'], category: 'cms', clientScope: { masterTable: 'cs_footer', masterIdCol: 'id_footer' } },
  { slug: 'cs_footer_lang:link_badge',           label: 'Footer — Badge lien',       table: 'cs_footer_lang', column: 'link_badge',   idCols: ['id_footer'], category: 'cms', clientScope: { masterTable: 'cs_footer', masterIdCol: 'id_footer' }, dedupe: 'source' },

  { slug: 'cs_footer_config_lang:description',         label: 'Footer config — Description',     table: 'cs_footer_config_lang', column: 'description',         idCols: ['id_footer_config'], category: 'cms', multiline: true, clientScope: { masterTable: 'cs_footer_config', masterIdCol: 'id_footer_config' } },
  { slug: 'cs_footer_config_lang:hours',               label: 'Footer config — Horaires',        table: 'cs_footer_config_lang', column: 'hours',               idCols: ['id_footer_config'], category: 'cms', multiline: true, clientScope: { masterTable: 'cs_footer_config', masterIdCol: 'id_footer_config' } },
  { slug: 'cs_footer_config_lang:logo_alt',            label: 'Footer config — Alt logo',        table: 'cs_footer_config_lang', column: 'logo_alt',            idCols: ['id_footer_config'], category: 'cms', clientScope: { masterTable: 'cs_footer_config', masterIdCol: 'id_footer_config' } },
  { slug: 'cs_footer_config_lang:contact_cta_label',   label: 'Footer config — CTA contact',     table: 'cs_footer_config_lang', column: 'contact_cta_label',   idCols: ['id_footer_config'], category: 'cms', clientScope: { masterTable: 'cs_footer_config', masterIdCol: 'id_footer_config' } },
  { slug: 'cs_footer_config_lang:bottombar_copyright', label: 'Footer config — Copyright',       table: 'cs_footer_config_lang', column: 'bottombar_copyright', idCols: ['id_footer_config'], category: 'cms', clientScope: { masterTable: 'cs_footer_config', masterIdCol: 'id_footer_config' } },

  { slug: 'cs_footer_social_lang:label',          label: 'Footer social — Label réseau',       table: 'cs_footer_social_lang', column: 'label',          idCols: ['id_social'], category: 'cms', clientScope: { masterTable: 'cs_footer_social', masterIdCol: 'id_social', parentTable: 'cs_footer_config', parentIdCol: 'id_footer_config' } },

  { slug: 'cs_header_lang:logo_alt',       label: 'Header — Alt logo',            table: 'cs_header_lang', column: 'logo_alt',       idCols: ['id_header'], category: 'cms', clientScope: { masterTable: 'cs_header', masterIdCol: 'id_header' } },
  { slug: 'cs_header_lang:logo_text',      label: 'Header — Texte logo',          table: 'cs_header_lang', column: 'logo_text',      idCols: ['id_header'], category: 'cms', clientScope: { masterTable: 'cs_header', masterIdCol: 'id_header' } },
  { slug: 'cs_header_lang:topbar_message', label: 'Header — Message topbar',      table: 'cs_header_lang', column: 'topbar_message', idCols: ['id_header'], category: 'cms', multiline: true, clientScope: { masterTable: 'cs_header', masterIdCol: 'id_header' } },

  { slug: 'cs_header_locale_lang:label', label: 'Header — Label langue switcher', table: 'cs_header_locale_lang', column: 'label', idCols: ['id_header_locale'], category: 'cms', clientScope: { masterTable: 'cs_header_locale', masterIdCol: 'id_header_locale', parentTable: 'cs_header', parentIdCol: 'id_header' } },

  { slug: 'cs_homepage_section_lang:title',     label: 'Homepage — Titre section',     table: 'cs_homepage_section_lang',  column: 'title',     idCols: ['id_section'], category: 'cms' },
  { slug: 'cs_homepage_section_lang:subtitle',  label: 'Homepage — Sous-titre section', table: 'cs_homepage_section_lang', column: 'subtitle',  idCols: ['id_section'], category: 'cms', multiline: true },

  { slug: 'cs_prefooter_section_lang:title',    label: 'Pré-footer — Titre section',   table: 'cs_prefooter_section_lang', column: 'title',     idCols: ['id_section'], category: 'cms' },
  { slug: 'cs_prefooter_section_lang:subtitle', label: 'Pré-footer — Sous-titre',      table: 'cs_prefooter_section_lang', column: 'subtitle',  idCols: ['id_section'], category: 'cms' },

  
  { slug: 'cs_homepage_block_lang:label',       label: 'Homepage block — Label',         table: 'cs_homepage_block_lang', column: 'label',       idCols: ['id_block'], category: 'cms' },
  { slug: 'cs_homepage_block_lang:title',       label: 'Homepage block — Titre',         table: 'cs_homepage_block_lang', column: 'title',       idCols: ['id_block'], category: 'cms' },
  { slug: 'cs_homepage_block_lang:subtitle',    label: 'Homepage block — Sous-titre',    table: 'cs_homepage_block_lang', column: 'subtitle',    idCols: ['id_block'], category: 'cms' },
  { slug: 'cs_homepage_block_lang:sticker',     label: 'Homepage block — Sticker',       table: 'cs_homepage_block_lang', column: 'sticker',     idCols: ['id_block'], category: 'cms' },
  { slug: 'cs_homepage_block_lang:kicker',      label: 'Homepage block — Kicker',        table: 'cs_homepage_block_lang', column: 'kicker',      idCols: ['id_block'], category: 'cms' },
  { slug: 'cs_homepage_block_lang:description', label: 'Homepage block — Description',   table: 'cs_homepage_block_lang', column: 'description', idCols: ['id_block'], category: 'cms', multiline: true },
  { slug: 'cs_homepage_block_lang:text',        label: 'Homepage block — Texte',         table: 'cs_homepage_block_lang', column: 'text',        idCols: ['id_block'], category: 'cms', multiline: true },
  { slug: 'cs_homepage_block_lang:header',      label: 'Homepage block — Header',        table: 'cs_homepage_block_lang', column: 'header',      idCols: ['id_block'], category: 'cms' },
  { slug: 'cs_homepage_block_lang:footer',      label: 'Homepage block — Footer',        table: 'cs_homepage_block_lang', column: 'footer',      idCols: ['id_block'], category: 'cms' },
  { slug: 'cs_homepage_block_lang:cta_label',   label: 'Homepage block — CTA label',     table: 'cs_homepage_block_lang', column: 'cta_label',   idCols: ['id_block'], category: 'cms' },
  { slug: 'cs_homepage_block_lang:alt',         label: 'Homepage block — Alt image',     table: 'cs_homepage_block_lang', column: 'alt',         idCols: ['id_block'], category: 'cms' },
  { slug: 'cs_homepage_block_lang:question',    label: 'Homepage block — FAQ question',  table: 'cs_homepage_block_lang', column: 'question',    idCols: ['id_block'], category: 'cms', multiline: true },
  { slug: 'cs_homepage_block_lang:answer_html', label: 'Homepage block — FAQ réponse',   table: 'cs_homepage_block_lang', column: 'answer_html', idCols: ['id_block'], category: 'cms', multiline: true, html: true },
]

export function findScope(slug: string): ScopeSpec | null {
  return STATIC_SCOPES.find(s => s.slug === slug) || null
}

export interface GroupScope {
  slug: string                             
  label: string                            
  category: ScopeSpec['category']
  members: string[]                        
  dynamicPsTranslationPrefix?: string      
}

export const GROUP_SCOPES: GroupScope[] = [
  {
    slug: 'group:header',
    label: 'Header — Tout',
    category: 'cms',
    members: [
      'cs_header_lang:logo_alt',
      'cs_header_lang:logo_text',
      'cs_header_lang:topbar_message',
      'cs_header_locale_lang:label',
    ],
  },
  {
    slug: 'group:footer',
    label: 'Footer — Tout',
    category: 'cms',
    members: [
      'cs_footer_lang:column_title',
      'cs_footer_lang:link_label',
      'cs_footer_lang:link_badge',
      'cs_footer_config_lang:description',
      'cs_footer_config_lang:hours',
      'cs_footer_config_lang:logo_alt',
      'cs_footer_config_lang:contact_cta_label',
      'cs_footer_config_lang:bottombar_copyright',
      'cs_footer_social_lang:label',
    ],
  },
  {
    slug: 'group:megamenu',
    label: 'Megamenu — Tout',
    category: 'cms',
    members: [
      'cs_megamenu_lang:label',
      'cs_megamenu_lang:description',
      'cs_megamenu_lang:badge',
      'cs_megamenu_lang:group_title',
    ],
  },
  {
    slug: 'group:homepage',
    label: 'Homepage — Tout (sections + blocks)',
    category: 'cms',
    members: [
      'cs_homepage_section_lang:title',
      'cs_homepage_section_lang:subtitle',
      'cs_homepage_block_lang:label',
      'cs_homepage_block_lang:title',
      'cs_homepage_block_lang:subtitle',
      'cs_homepage_block_lang:sticker',
      'cs_homepage_block_lang:kicker',
      'cs_homepage_block_lang:description',
      'cs_homepage_block_lang:text',
      'cs_homepage_block_lang:header',
      'cs_homepage_block_lang:footer',
      'cs_homepage_block_lang:cta_label',
      'cs_homepage_block_lang:alt',
      'cs_homepage_block_lang:question',
      'cs_homepage_block_lang:answer_html',
    ],
  },
  {
    slug: 'group:prefooter',
    label: 'Pré-footer — Tout',
    category: 'cms',
    members: [
      'cs_prefooter_section_lang:title',
      'cs_prefooter_section_lang:subtitle',
    ],
  },
  {
    slug: 'group:ps_catalog',
    label: 'Catalogue PS — Tout (produits + catégories)',
    category: 'catalog',
    members: [
      'ps_product_lang:name',
      'ps_product_lang:description_short',
      'ps_product_lang:description',
      'ps_category_lang:name',
      'ps_category_lang:description',
    ],
  },
  {
    slug: 'group:ps_seo',
    label: 'SEO PS — Tout (meta + URL)',
    category: 'seo',
    members: [
      'ps_product_lang:meta_title',
      'ps_product_lang:meta_description',
      'ps_product_lang:link_rewrite',
      'ps_category_lang:meta_title',
      'ps_category_lang:meta_description',
      'ps_category_lang:link_rewrite',
      'ps_meta_lang:title',
      'ps_meta_lang:description',
    ],
  },
  {
    slug: 'group:ps_cms',
    label: 'CMS PS — Tout',
    category: 'cms',
    members: [
      'ps_cms_lang:meta_title',
      'ps_cms_lang:meta_description',
      'ps_cms_lang:content',
      'ps_cms_category_lang:name',
      'ps_cms_category_lang:description',
    ],
  },
  {
    slug: 'group:hub_ui',
    label: 'Hub UI — Tous les domaines HubXxx',
    category: 'i18n-hub',
    members: [],
    dynamicPsTranslationPrefix: 'Hub',
  },
]

export function findGroupScope(slug: string): GroupScope | null {
  return GROUP_SCOPES.find(g => g.slug === slug) || null
}

export function encodeGroupRowKey(memberSlug: string, innerRowKey: string): string {
  return `${memberSlug}|${innerRowKey}`
}

export function decodeGroupRowKey(groupRowKey: string): { memberSlug: string; innerRowKey: string } | null {
  const idx = groupRowKey.indexOf('|')
  if (idx < 0) return null
  return {
    memberSlug: groupRowKey.slice(0, idx),
    innerRowKey: groupRowKey.slice(idx + 1),
  }
}

export function buildPsTranslationScope(domain: string): ScopeSpec {
  return {
    slug: `ps_translation:${domain}`,
    label: `ps_translation — ${domain}`,
    table: 'ps_translation',
    column: 'translation',
    idCols: ['domain', 'key'],
    domain,
    category: domain.startsWith('Hub') ? 'i18n-hub' : 'i18n-hub',
    multiline: true,
  }
}
