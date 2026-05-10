/**
 *
 * Drizzle PG schema for the OSINT extension of the ac_smartlead module.
 *
 * Doctrine: no new module — we extend ac_smartlead with a sub-domain
 * dedicated to the specialized context. cs_smartlead remains the CRM person table
 * pure (leads chauds entrants). L'extension 1:1 cs_smartlead_rungis porte
 * columns specific to the specialized context (company + strategic tagging +
 * enrichissement Insee + empreinte digitale).
 *
 * Pattern: 1:1 extension type `_extra` — the PK is also the FK to
 * cs_smartlead.id_ac_smartlead. Filtrage trivial :
 *   - INNER JOIN smartlead_rungis  → uniquement leads Rungis
 *   - LEFT JOIN ... WHERE NULL     → uniquement leads chauds non-Rungis
 *
 * N-N child table cs_smartlead_rungis_certification: quality certifications
 * (HACCP/IFS/BRC/ISO9001/Bio/Halal/Kasher/Fel'partenariat/Ecocert/GlobalGap),
 * normalized to 1NF (doctrine §NAMING rule 11 against domain JSON).
 */

import {
  index,
  integer,
  numeric,
  pgSchema,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  date,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export type RungisSectorCode =
  | 'fruits-legumes'
  | 'bio'
  | 'carnes'
  | 'mer'
  | 'laitiers'
  | 'gastronomie'
  | 'horticulture'
  | 'materiel'
  | 'logistique'
  | 'services'

export type RungisStatusCode =
  | 'grossiste'
  | 'importateur'
  | 'courtier'
  | 'detaillant'
  | 'producteur'
  | 'exportateur'
  | 'centrale'
  | 'fabricant'
  | 'demi-grossiste'
  | 'plate-forme'
  | 'autre'

export type VerticalTarget =
  | 'bacchus'
  | 'ceres'
  | 'poseidon'
  | 'hephaistos'
  | 'hermes'
  | 'hors-cible'
  | 'a-classer'

export type AtlasTier = 't1' | 't2' | 't3' | 'veille' | 'ecarte' | 'a-classer'

export type AtlasStatus =
  | 'nouveau'
  | 'qualifie'
  | 'veille'
  | 'pret-contact'
  | 'ecarte'

export type RelationalRisk =
  | 'aucun'
  | 'voisin-example-shop'
  | 'client-aude-connu'
  | 'client-ac-connu'

export type RungisCertCode =
  | 'haccp'
  | 'ifs'
  | 'brc'
  | 'iso9001'
  | 'iso22000'
  | 'bio'
  | 'halal'
  | 'kasher'
  | 'fel-partenariat'
  | 'fel-engagement'
  | 'fel-excellence'
  | 'ecocert'
  | 'globalgap'
  | 'msc'
  | 'asc'
  | 'bleu-blanc-coeur'
  | 'autre'

export const smartleadRungisVaisseau = vaisseauMereAcSchema.table(
  'cs_smartlead_rungis',
  {
    idAcSmartlead: integer('id_ac_smartlead').primaryKey(),
    // Contexte société Rungis (extrait du carnet)
    rungisStatus: varchar('rungis_status', { length: 32 }).$type<RungisStatusCode>(),
    rungisLocation: varchar('rungis_location', { length: 96 }),
    rungisSector: varchar('rungis_sector', { length: 32 }).$type<RungisSectorCode>(),
    rungisSubsector: varchar('rungis_subsector', { length: 64 }),
    rungisSanitaryApproval: varchar('rungis_sanitary_approval', { length: 64 }),
    rungisProductsRaw: text('rungis_products_raw'),
    // Enrichissement Insee/Pappers (société, post-import)
    siren: varchar('siren', { length: 9 }),
    legalForm: varchar('legal_form', { length: 32 }),
    apeCode: varchar('ape_code', { length: 8 }),
    dateCreation: date('date_creation'),
    capitalSocial: numeric('capital_social', { precision: 15, scale: 2 }),
    headcount: integer('headcount'),
    annualRevenue: numeric('annual_revenue', { precision: 15, scale: 2 }),
    netResult: numeric('net_result', { precision: 15, scale: 2 }),
    dirigeantBirthYear: smallint('dirigeant_birth_year'),
    dirigeantRole: varchar('dirigeant_role', { length: 64 }),
    dirigeantFullName: varchar('dirigeant_full_name', { length: 128 }),
    // Empreinte digitale (audit web auto)
    websiteTech: varchar('website_tech', { length: 64 }),
    hasEcommerce: smallint('has_ecommerce'),
    lighthouseScore: smallint('lighthouse_score'),
    // Tagging stratégique Sun Tzu
    verticalTarget: varchar('vertical_target', { length: 16 })
      .$type<VerticalTarget>()
      .notNull()
      .default('a-classer'),
    tier: varchar('tier', { length: 12 })
      .$type<AtlasTier>()
      .notNull()
      .default('a-classer'),
    signalScore: smallint('signal_score').notNull().default(0),
    relationalRisk: varchar('relational_risk', { length: 24 })
      .$type<RelationalRisk>()
      .notNull()
      .default('aucun'),
    atlasStatus: varchar('atlas_status', { length: 16 })
      .$type<AtlasStatus>()
      .notNull()
      .default('nouveau'),
    notesAtlas: text('notes_atlas'),
    sourceTag: varchar('source_tag', { length: 48 }).notNull().default('rungis-carnet-2025'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    kSector: index('idx_smartlead_rungis_sector').on(t.rungisSector),
    kVertical: index('idx_smartlead_rungis_vertical').on(t.verticalTarget),
    kTier: index('idx_smartlead_rungis_tier').on(t.tier),
    kSiren: index('idx_smartlead_rungis_siren').on(t.siren),
  }),
)

export const smartleadRungisCertificationVaisseau = vaisseauMereAcSchema.table(
  'cs_smartlead_rungis_certification',
  {
    idSmartleadRungisCertification: serial(
      'id_smartlead_rungis_certification',
    ).primaryKey(),
    idAcSmartlead: integer('id_ac_smartlead').notNull(),
    certCode: varchar('cert_code', { length: 24 })
      .$type<RungisCertCode>()
      .notNull(),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull(),
  },
  (t) => ({
    uLeadCert: uniqueIndex('uq_smartlead_rungis_cert').on(
      t.idAcSmartlead,
      t.certCode,
    ),
    kCertCode: index('idx_smartlead_rungis_cert_code').on(t.certCode),
  }),
)

export type SmartleadRungisRow = typeof smartleadRungisVaisseau.$inferSelect
export type SmartleadRungisInsert = typeof smartleadRungisVaisseau.$inferInsert
export type SmartleadRungisCertRow =
  typeof smartleadRungisCertificationVaisseau.$inferSelect
export type SmartleadRungisCertInsert =
  typeof smartleadRungisCertificationVaisseau.$inferInsert
