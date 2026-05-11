

import { requireCustomer } from '~/server/utils/customer-session'
import { listForCustomer } from '~/server/utils/wishlist-db'

export default defineEventHandler(async (event) => {
  const session = requireCustomer(event)
  const lists = await listForCustomer(session.customerId, { event })
  const itemTotal = lists.reduce((s, l) => s + l.itemCount, 0)
  return {
    success: true,
    lists: lists.map((l) => ({
      id_wishlist: l.idWishlist,
      name: l.name,
      is_default: l.isDefault,
      item_count: l.itemCount,
      share_token: l.shareToken,
      date_add: l.dateAdd,
      date_upd: l.dateUpd,
    })),
    total: lists.length,
    item_total: itemTotal,
  }
})
