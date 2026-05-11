

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT
      w.id_warehouse        AS id,
      w.reference,
      w.name,
      w.management_type     AS managementType,
      a.address1,
      a.address2,
      a.postcode,
      a.city,
      a.phone,
      a.phone_mobile        AS phoneMobile,
      cl.name               AS country,
      a.id_country          AS idCountry,
      COALESCE(s.nb_products, 0) AS nbProducts,
      COALESCE(s.total_qty, 0)   AS totalQty
    FROM ps_warehouse w
    LEFT JOIN ps_address a ON a.id_address = w.id_address AND a.deleted = 0
    LEFT JOIN ps_country_lang cl ON cl.id_country = a.id_country AND cl.id_lang = 1
    LEFT JOIN (
      SELECT id_warehouse,
             COUNT(DISTINCT id_product)  AS nb_products,
             SUM(physical_quantity)      AS total_qty
      FROM ps_stock
      GROUP BY id_warehouse
    ) s ON s.id_warehouse = w.id_warehouse
    WHERE w.deleted = 0
    ORDER BY w.name ASC
  `)

  return { ok: true, warehouses: rows }
})
