/**
 *
 * Common interface for all e-commerce CMS connectors.
 * The hub calls ONLY these methods — never CMS-specific code.
 *
 * Cf. CODEMYSHOP_STRATEGY.md — Architecture Connecteurs.
 */

// ── Types partagés (CMS-agnostiques) ──────────────────────────────────────────

export interface CatalogProduct {
  id:                number
  name:              string
  ref:               string
  price:             string    // formaté (ex: "21,48 €")
  priceRaw:          number
  image?:            string
  badge?:            string
  active:            boolean
  description_short?: string
}

export interface ProductFeatureValue {
  /** id_feature (group) */
  id:        number
  /** Feature name, e.g.: "Size", "Origin" */
  name:      string
  /** id_feature_value */
  valueId:   number
  /** Valeur, ex: "W320", "Californie" */
  value:     string
}

export interface ProductDetail {
  id:                number
  name:              string
  reference:         string
  price:             number
  priceFormatted:    string
  description:       string
  descriptionShort:  string
  weight:            string
  ean13:             string
  quantity:          number
  active:            boolean
  images:            string[]
  combinations:      ProductCombination[]
  /** Product characteristics (Example Shop: size, origin, packaging…) */
  features?:         ProductFeatureValue[]
  /** Technical sheets / product attachments */
  attachments?:      ProductAttachment[]
}

export interface ProductAttachment {
  id:        number
  name:      string
  fileName:  string
  mime:      string
  fileSize:  number
}

export interface ProductCombination {
  id:         number
  reference:  string
  price:      number
  quantity:   number
  attributes: string[]
}

export interface CatalogCategory {
  id:               number
  name:             string
  description:      string
  meta_description: string
  id_parent:        number
  productCount:     number | null
}

export interface EmployeeInput {
  firstname:  string
  lastname:   string
  email:      string
  role:       string
  password?:  string
}

export interface EmployeeResult {
  id:    number | null
  error: string | null
  generatedPassword?: string
}

export interface ClientContext {
  clientId:          string
  clientName:        string
  totalProducts:     number
  totalCategories:   number
  avgPrice:          number
  avgPriceFormatted: string
  priceRange:        { min: number; max: number }
  topCategories:     string[]
  businessType:      string
  catalogStrength:   string
  fetchedAt:         string
}

export interface BlogPost {
  id:             number
  title:          string
  category:       string
  slug:           string
  excerpt:        string
  coverImage:     string
  nuxtUrl:        string
}

// ── Types Panier ─────────────────────────────────────────────────────────────

export interface CartData {
  id:            number
  customerId:    number
  items:         CartItemData[]
  totalHT:       number
  totalTTC:      number
  totalTax:      number
  shippingCost:  number
  carrierId:     number | null
  discountCode?: string
  discountHT?:   number
  discountTTC?:  number
}

export interface CartItemData {
  productId:     number
  combinationId: number
  name:          string
  reference:     string
  quantity:      number
  priceHT:       number
  priceTTC:      number
  image?:        string
  /** Product pills (matching ProductCard) — displayed in the drawer/cart page
   * to remind of the product card (e.g., "3kg" / "bucket" / "W320"). */
  format?:       string
  packaging?:    string
  caliber?:      string
  /** Net price per kilogram (raw + formatted FR). Calculated from features
   * `Net weight` × `Units per parcel` (cf. by-category.get.ts).  */
  pricePerKgHT?: number
  pricePerKgFormatted?: string
  /** Effective VAT rate (e.g.: 5.5, 20). Displayed in the secondary note
   * "VAT at X %, i.e., for N parcels: Y € before tax". */
  taxRate?:      number
  /** Net package price BEFORE promotion (= base price). Present only if
   * an active `ps_specific_price` reduces the line price. The drawer
   * and /cart display it struck through next to the final `priceHT`. */
  priceHTBeforeDiscount?:        number
  /** Price per kg BEFORE promotion, formatted FR (e.g. "15,20 €"). Displayed struck-through
   * next to the final `pricePerKgFormatted`. */
  pricePerKgFormattedBeforeDiscount?: string
  /** Label badge promo ("-20%" ou "-2,50 €"). */
  reductionLabel?:               string
  /** Short unit price suffix — DB-First, derived from `p.unity` + features
   *  (HT/K, HT/L, HT/U). Cf. core/server/utils/unity-label.ts. */
  unitLabel?:                    string
}

// ── Types Adresse ────────────────────────────────────────────────────────────

export interface AddressData {
  id?:           number
  customerId:    number
  alias:         string
  company?:      string
  firstname:     string
  lastname:      string
  address1:      string
  address2?:     string
  postcode:      string
  city:          string
  countryId:     number
  phone?:        string
  vatNumber?:    string
}

// ── Types Transporteur ───────────────────────────────────────────────────────

export interface CarrierData {
  id:            number
  name:          string
  delay:         string
  price:         number
  freeAbove:     number | null
  active:        boolean
  /** intrinsically free carrier (PS is_free=1) — different from a price calculated at 0 by threshold effect */
  isFree?:       boolean
}

// ── Types Commande ───────────────────────────────────────────────────────────

export interface OrderInput {
  cartId:              number
  customerId:          number
  addressDeliveryId:   number
  addressInvoiceId:    number
  carrierId:           number
  paymentMethod:       string
  paymentModule:       string
}

export interface OrderData {
  id:                  number
  reference:           string
  customerId:          number
  status:              string
  statusId:            number
  payment:             string
  totalPaidHT:         number
  totalPaidTTC:        number
  totalShipping:       number
  totalProducts:       number
  items:               OrderItemData[]
  dateAdd:             string
  addressDelivery?:    AddressData
  addressInvoice?:     AddressData
  invoiceNumber?:      string
  invoiceDate?:        string
}

export interface OrderItemData {
  productId:           number
  name:                string
  reference:           string
  quantity:            number
  priceHT:             number
  priceTTC:            number
  /** Net package price BEFORE promotion (= `original_product_price` PS). Present
   * only if a promotion was applied to the line at the time of
   * order creation. Displayed struck through in the order page. */
  priceHTBeforeDiscount?: number
  /** Promo badge label (derived from reduction_percent / reduction_amount). */
  reductionLabel?:        string
  /** Suffixe court prix unitaire (HT/K, HT/L, HT/U) — DB-First. */
  unitLabel?:             string
  /** Formatted unit price (e.g. "8,36 €") — displayed next to unitLabel
   * in the confirmation email recap + order page. */
  pricePerUnitFormatted?: string
}

export interface OrderStatusData {
  id:    number
  name:  string
  color: string
}

// ── Types Filtres / Promos ────────────────────────────────────────────────────

export interface ProductFilter {
  id:      number
  name:    string
  values:  { id: number; name: string; count: number }[]
}

export interface SpecificPrice {
  productId:     number
  reduction:     number
  reductionType: 'percentage' | 'amount'
  fromQuantity:  number
}

export interface ProductListParams {
  categoryId?: number
  page?:       number
  limit?:      number
  sort?:       'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'date_desc'
  priceMin?:   number
  priceMax?:   number
  features?:   Record<number, number[]>  // featureId → [valueId, ...]
  query?:      string
}

export interface ProductListResult {
  products:   CatalogProduct[]
  total:      number
  page:       number
  limit:      number
  filters:    ProductFilter[]
}

// ── Types Suivi / Stats ──────────────────────────────────────────────────────

export interface OrderHistoryEntry {
  id:         number
  statusId:   number
  statusName: string
  dateAdd:    string
}

export interface RevenueStats {
  today:     number
  week:      number
  month:     number
  total:     number
  ordersToday:  number
  ordersWeek:   number
  ordersMonth:  number
  ordersTotal:  number
  avgOrderValue: number
}

export interface TopProduct {
  productId:  number
  name:       string
  quantity:   number
  revenue:    number
}

// ── Types Client ─────────────────────────────────────────────────────────────

export interface CustomerData {
  id:           number
  email:        string
  firstname:    string
  lastname:     string
  company?:     string
  siret?:       string
  phone?:       string
  active:       boolean
  dateAdd:      string
  newsletter:   boolean
  ordersCount?: number
  totalSpent?:  number
}

// ── Connector interface ───────────────────────────────────────────────────

export interface BaseConnector {
  readonly platform: string   // 'prestashop' | 'woocommerce' | 'shopify'
  readonly clientId: string

  // Catalog (optional idLang: filters PS Webservice `language=X` to
  // return only the requested language instead of the complete multilang dump)
  getProducts(categoryId: number, limit?: number): Promise<CatalogProduct[]>
  getNewProducts(limit?: number): Promise<CatalogProduct[]>
  searchProducts(query: string, limit?: number, idLang?: number): Promise<CatalogProduct[]>
  getProduct(id: number, idLang?: number): Promise<ProductDetail | null>
  getCategories(limit?: number, idLang?: number): Promise<CatalogCategory[]>

  // Advanced catalog
  listProducts(params: ProductListParams): Promise<ProductListResult>
  getSpecificPrices(): Promise<SpecificPrice[]>
  getBestSellers(limit?: number): Promise<CatalogProduct[]>

  // CRUD Produits (BO)
  createProduct(data: any): Promise<{ id: number } | null>
  updateProduct(id: number, data: any): Promise<boolean>
  updateStock(productId: number, quantity: number): Promise<boolean>

  // Generic access to an API resource (cart_rules, etc.)
  fetchResource(resource: string, query?: Record<string, string>): Promise<any>

  // Panier
  createCart(customerId: number): Promise<CartData | null>
  getCart(cartId: number): Promise<CartData | null>
  getLastCustomerCart?(customerId: number): Promise<CartData | null>
  addToCart(cartId: number, productId: number, quantity: number, combinationId?: number): Promise<CartData | null>
  updateCartItem(cartId: number, productId: number, quantity: number, combinationId?: number): Promise<CartData | null>
  removeFromCart(cartId: number, productId: number, combinationId?: number): Promise<boolean>

  // Adresses
  getAddresses(customerId: number): Promise<AddressData[]>
  createAddress(data: AddressData): Promise<AddressData | null>
  updateAddress(addressId: number, data: Partial<AddressData>): Promise<AddressData | null>

  // Pays actifs
  getCountries?(): Promise<{ id: number; name: string }[]>

  // Transporteurs
  getCarriers(): Promise<CarrierData[]>

  // Commandes
  createOrder(data: OrderInput): Promise<OrderData | null>
  getOrders(customerId: number, limit?: number): Promise<OrderData[]>
  getOrder(orderId: number): Promise<OrderData | null>
  getOrderStatuses(): Promise<OrderStatusData[]>
  updateOrderStatus(orderId: number, statusId: number): Promise<boolean>

  // Profil client
  getCustomer(customerId: number): Promise<CustomerData | null>
  updateCustomer(customerId: number, data: Partial<CustomerData>): Promise<CustomerData | null>
  getCustomers(limit?: number): Promise<CustomerData[]>

  // Suivi commande
  getOrderHistory(orderId: number): Promise<OrderHistoryEntry[]>

  // Stats BO
  getRevenueStats(clientId?: string): Promise<RevenueStats>
  getTopProducts(limit?: number): Promise<TopProduct[]>

  // Employees
  createEmployee(data: EmployeeInput): Promise<EmployeeResult>

  // Contexte IA
  getClientContext(): Promise<ClientContext>
}

// ── ConnectorManager (multi-tenant resolution) ────────────────────────────

import { PrestashopConnector } from './prestashop'

const connectorCache = new Map<string, BaseConnector>()

/**
 * Resolves the appropriate connector for a tenant.
 * Currently: all tenants use PrestaShop.
 * Future: read the CMS type from the tenant config.
 */
export function getConnector(clientId?: string): BaseConnector {
  const id = clientId || 'ac-hub'

  if (connectorCache.has(id)) return connectorCache.get(id)!

  // Futur : lire cs_client_vps pour déterminer le type de CMS
  // const clientConfig = readClientConfig(id)
  // if (clientConfig.platform === 'woocommerce') return new WooCommerceConnector(id)

  const connector = new PrestashopConnector(id)
  connectorCache.set(id, connector)
  return connector
}
