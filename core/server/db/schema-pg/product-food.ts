

import {
  integer, numeric, primaryKey, smallint, text, timestamp, varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const productFood = vaisseauMereAcSchema.table(
  'cs_product_food',
  {
    idProduct: integer('id_product').notNull().primaryKey(),
    idAttachment: integer('id_attachment'),
    ingredientsJson: text('ingredients_json'),
    allergensJson: text('allergens_json'),
    nutEnergyKj: integer('nut_energy_kj'),
    nutEnergyKcal: integer('nut_energy_kcal'),
    nutFatG: numeric('nut_fat_g', { precision: 7, scale: 2 }),
    nutSatFatG: numeric('nut_sat_fat_g', { precision: 7, scale: 2 }),
    nutCarbsG: numeric('nut_carbs_g', { precision: 7, scale: 2 }),
    nutSugarsG: numeric('nut_sugars_g', { precision: 7, scale: 2 }),
    nutProteinsG: numeric('nut_proteins_g', { precision: 7, scale: 2 }),
    nutSaltG: numeric('nut_salt_g', { precision: 7, scale: 2 }),
    originCountryIso2: varchar('origin_country_iso2', { length: 2 }),
    countryOrigin: varchar('country_origin', { length: 100 }),
    caliber: varchar('caliber', { length: 100 }),
    isIonised: smallint('is_ionised'),
    hasNanomaterials: smallint('has_nanomaterials'),
    isNonGmo: smallint('is_non_gmo'),
    shelfLifeMonths: integer('shelf_life_months'),
    storageTemperature: varchar('storage_temperature', { length: 30 }),
    storageHumidity: varchar('storage_humidity', { length: 30 }),
    packContainer: varchar('pack_container', { length: 40 }),
    packUnitWeight: varchar('pack_unit_weight', { length: 30 }),
    packUnitsPerCarton: integer('pack_units_per_carton'),
    packCartonWeight: varchar('pack_carton_weight', { length: 30 }),
    packCartonsPerPallet: integer('pack_cartons_per_pallet'),
    packMaterial: varchar('pack_material', { length: 30 }),
    extractionSource: varchar('extraction_source', { length: 40 }),
    extractionConfidence: numeric('extraction_confidence', { precision: 3, scale: 2 }),
    extractedAt: timestamp('extracted_at', { mode: 'date', precision: 0 }),
    active: smallint('active').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const productFoodLang = vaisseauMereAcSchema.table(
  'cs_product_food_lang',
  {
    idProduct: integer('id_product').notNull(),
    idLang: integer('id_lang').notNull(),
    designation: varchar('designation', { length: 255 }),
    descriptionNarrative: text('description_narrative'),
    processProduction: text('process_production'),
    sensoryJson: text('sensory_json'),
    categoryLegal: varchar('category_legal', { length: 128 }),
    additionalMentions: text('additional_mentions'),
    usageConditions: varchar('usage_conditions', { length: 255 }),
    consumerWarnings: text('consumer_warnings'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idProduct, t.idLang] }),
  }),
)
