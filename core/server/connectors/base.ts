

export interface CatalogProduct {
  id:                number
  name:              string
  ref:               string
  price:             string    
  priceRaw:          number
  image?:            string
  badge?:            string
  active:            boolean
  description_short?: string
}

export interface ProductFeatureValue {
  
  id:        number
  
  name:      string
  
  valueId:   number
  
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
  
  features?:         ProductFeatureValue[]
  
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
  

  format?:       string
  packaging?:    string
  caliber?:      string
  

  pricePerKgHT?: number
  pricePerKgFormatted?: string
  

  taxRate?:      number
  

  priceHTBeforeDiscount?:        number
  

  pricePerKgFormattedBeforeDiscount?: string
  
  reductionLabel?:               string
  

  unitLabel?:                    string
}

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

export interface CarrierData {
  id:            number
  name:          string
  delay:         string
  price:         number
  freeAbove:     number | null
  active:        boolean
  
  isFree?:       boolean
}

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
  

  priceHTBeforeDiscount?: number
  
  reductionLabel?:        string
  
  unitLabel?:             string
  

  pricePerUnitFormatted?: string
}

export interface OrderStatusData {
  id:    number
  name:  string
  color: string
}

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
  features?:   Record<number, number[]>  
  query?:      string
}

export interface ProductListResult {
  products:   CatalogProduct[]
  total:      number
  page:       number
  limit:      number
  filters:    ProductFilter[]
}

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

export interface BaseConnector {
  readonly platform: string   
  readonly clientId: string

  
  
  getProducts(categoryId: number, limit?: number): Promise<CatalogProduct[]>
  getNewProducts(limit?: number): Promise<CatalogProduct[]>
  searchProducts(query: string, limit?: number, idLang?: number): Promise<CatalogProduct[]>
  getProduct(id: number, idLang?: number): Promise<ProductDetail | null>
  getCategories(limit?: number, idLang?: number): Promise<CatalogCategory[]>

  
  listProducts(params: ProductListParams): Promise<ProductListResult>
  getSpecificPrices(): Promise<SpecificPrice[]>
  getBestSellers(limit?: number): Promise<CatalogProduct[]>

  
  createProduct(data: any): Promise<{ id: number } | null>
  updateProduct(id: number, data: any): Promise<boolean>
  updateStock(productId: number, quantity: number): Promise<boolean>

  
  fetchResource(resource: string, query?: Record<string, string>): Promise<any>

  
  createCart(customerId: number): Promise<CartData | null>
  getCart(cartId: number): Promise<CartData | null>
  getLastCustomerCart?(customerId: number): Promise<CartData | null>
  addToCart(cartId: number, productId: number, quantity: number, combinationId?: number): Promise<CartData | null>
  updateCartItem(cartId: number, productId: number, quantity: number, combinationId?: number): Promise<CartData | null>
  removeFromCart(cartId: number, productId: number, combinationId?: number): Promise<boolean>

  
  getAddresses(customerId: number): Promise<AddressData[]>
  createAddress(data: AddressData): Promise<AddressData | null>
  updateAddress(addressId: number, data: Partial<AddressData>): Promise<AddressData | null>

  
  getCountries?(): Promise<{ id: number; name: string }[]>

  
  getCarriers(): Promise<CarrierData[]>

  
  createOrder(data: OrderInput): Promise<OrderData | null>
  getOrders(customerId: number, limit?: number): Promise<OrderData[]>
  getOrder(orderId: number): Promise<OrderData | null>
  getOrderStatuses(): Promise<OrderStatusData[]>
  updateOrderStatus(orderId: number, statusId: number): Promise<boolean>

  
  getCustomer(customerId: number): Promise<CustomerData | null>
  updateCustomer(customerId: number, data: Partial<CustomerData>): Promise<CustomerData | null>
  getCustomers(limit?: number): Promise<CustomerData[]>

  
  getOrderHistory(orderId: number): Promise<OrderHistoryEntry[]>

  
  getRevenueStats(clientId?: string): Promise<RevenueStats>
  getTopProducts(limit?: number): Promise<TopProduct[]>

  
  createEmployee(data: EmployeeInput): Promise<EmployeeResult>

  
  getClientContext(): Promise<ClientContext>
}

import { PrestashopConnector } from './prestashop'

const connectorCache = new Map<string, BaseConnector>()

export function getConnector(clientId?: string): BaseConnector {
  const id = clientId || 'ac-hub'

  if (connectorCache.has(id)) return connectorCache.get(id)!

  
  
  

  const connector = new PrestashopConnector(id)
  connectorCache.set(id, connector)
  return connector
}
