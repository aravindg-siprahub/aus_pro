/** View models for the admin area. These are what the UI consumes; raw GraphQL shapes stay inside this folder. */

export interface Money {
  amount: number;
  currency: string;
}

export interface PageInfo {
  hasNext: boolean;
  hasPrevious: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface Page<T> {
  items: T[];
  pageInfo: PageInfo;
}

export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED" | "UNLISTED";

export interface InventoryState {
  /** null when Shopify doesn't report a quantity (inventory not tracked). */
  quantity: number | null;
  status: "in_stock" | "low" | "out" | "untracked";
}

export interface AdminProductRow {
  id: string; // numeric part of the Shopify GID, safe to put in URLs
  title: string;
  handle: string;
  status: ProductStatus;
  productType: string;
  vendor: string;
  imageUrl: string | null;
  imageAlt: string;
  variantCount: number;
  price: { min: Money; max: Money };
  inventory: InventoryState;
  updatedAt: string;
}

export interface AdminVariant {
  id: string;
  title: string;
  sku: string | null;
  price: Money;
  options: { name: string; value: string }[];
  inventory: InventoryState;
  /** Whether the variant can be ordered right now (Shopify's availableForSale). */
  availableForSale: boolean;
  /** "DENY" stops sales at zero stock; "CONTINUE" allows overselling. */
  sellsWhenOutOfStock: boolean;
}

export interface AdminProductDetail extends Omit<AdminProductRow, "variantCount" | "price"> {
  description: string;
  tags: string[];
  createdAt: string;
  storefrontUrl: string | null;
  options: { name: string; values: string[] }[];
  images: { url: string; alt: string }[];
  variants: AdminVariant[];
  variantsTruncated: boolean;
}

export interface AdminInventoryRow {
  variantId: string;
  productId: string;
  productTitle: string;
  productStatus: ProductStatus;
  variantTitle: string;
  sku: string | null;
  inventory: InventoryState;
  sellsWhenOutOfStock: boolean;
}

export interface AdminOrderRow {
  id: string;
  number: string;
  createdAt: string;
  /** null when the app lacks the read_customers permission. */
  customerName: string | null;
  financialStatus: string;
  fulfillmentStatus: string;
  total: Money;
  itemCount: number;
  cancelled: boolean;
  test: boolean;
}

export interface AdminLineItem {
  title: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: Money;
  total: Money;
  imageUrl: string | null;
  /** The customer's print: readable key/value pairs. Internal (underscore) properties are removed. */
  print: { key: string; value: string }[];
}

export interface AdminOrderDetail extends AdminOrderRow {
  email: string | null;
  shipTo: string | null; // "City, Region, Country" only
  lineItems: AdminLineItem[];
  subtotal: Money;
  shipping: Money;
  tax: Money;
  note: string | null;
}

export interface AdminCustomerRow {
  id: string;
  name: string;
  email: string | null;
  orderCount: number;
  totalSpent: Money;
  createdAt: string;
}

export interface AdminCustomerDetail extends AdminCustomerRow {
  location: string | null; // "City, Region, Country" only
  orders: AdminOrderRow[];
}

export type Count = { value: number; atLeast: boolean };

export interface DashboardData {
  shop: { name: string; currency: string };
  products: Count;
  activeProducts: Count;
  orders30d: Count;
  /** Paid revenue over the last 30 days; `partial` when more orders existed than were summed. */
  revenue30d: { money: Money; orderCount: number; partial: boolean };
  /** null when customers aren't available (permission missing). */
  customers: Count | null;
  lowStock: { threshold: number; rows: AdminInventoryRow[]; atLeast: boolean };
  recentOrders: AdminOrderRow[];
  /** Panels that couldn't load, with a plain-English reason. */
  unavailable: { customers?: string; orders?: string; lowStock?: string };
  generatedAt: string;
}
