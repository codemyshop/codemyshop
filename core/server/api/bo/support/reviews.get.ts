

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  try {
    const [reviews, stats] = await Promise.all([
      db.query<any>(`
        SELECT
          pc.id_product_comment                           AS id,
          pc.id_product                                   AS productId,
          pl.name                                         AS productName,
          pc.customer_name                                AS customerName,
          pc.title,
          pc.content,
          pc.grade,
          pc.validate                                     AS validated,
          pc.date_add                                     AS dateAdd
        FROM ps_product_comment pc
        LEFT JOIN ps_product_lang pl ON pl.id_product = pc.id_product AND pl.id_lang = 1
        WHERE pc.deleted = 0
        ORDER BY pc.date_add DESC
        LIMIT 50
      `),
      db.get<any>(`
        SELECT
          COUNT(*)                                        AS total,
          SUM(CASE WHEN validate = 1 THEN 1 ELSE 0 END)   AS approved,
          SUM(CASE WHEN validate = 0 THEN 1 ELSE 0 END)   AS pending,
          ROUND(AVG(grade), 2)                            AS avgGrade
        FROM ps_product_comment
        WHERE deleted = 0
      `),
    ])
    return {
      stats: {
        total:    Number(stats?.total || 0),
        approved: Number(stats?.approved || 0),
        pending:  Number(stats?.pending || 0),
        avgGrade: Number(stats?.avgGrade || 0),
      },
      reviews: reviews.map((r: any) => ({
        id: r.id, productId: r.productId, productName: r.productName,
        customerName: r.customerName || 'Anonyme',
        title: r.title, content: r.content,
        grade: Number(r.grade || 0),
        validated: Number(r.validated) === 1,
        dateAdd: r.dateAdd,
      })),
    }
  } catch (err: any) {
    console.error('[bo/support/reviews] DB error:', err?.message)
    return {
      stats: { total: 0, approved: 0, pending: 0, avgGrade: 0 },
      reviews: [],
    }
  }
})
