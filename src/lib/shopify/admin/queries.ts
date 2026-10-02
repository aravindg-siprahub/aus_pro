/**
 * Admin GraphQL documents. Field names were checked against the Admin GraphQL reference:
 * featuredMedia/media (not the deprecated featuredImage/images), defaultEmailAddress (not the
 * deprecated email on Customer) and count fields with their `precision`.
 * Page sizes keep each request far below the 1,000-point single-query cost limit.
 */

const MONEY = "amount currencyCode";

export const PRODUCT_LIST = /* GraphQL */ `
  query AdminProducts($first: Int, $last: Int, $after: String, $before: String, $query: String) {
    products(first: $first, last: $last, after: $after, before: $before, query: $query, sortKey: UPDATED_AT, reverse: true) {
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      nodes {
        id title handle status productType vendor totalInventory tracksInventory updatedAt
        variantsCount { count }
        priceRangeV2 { minVariantPrice { ${MONEY} } maxVariantPrice { ${MONEY} } }
        featuredMedia { preview { image { url altText } } }
      }
    }
  }
`;

export const PRODUCT_TYPES = /* GraphQL */ `
  query AdminProductTypes { productTypes(first: 50) { nodes } }
`;

export const PRODUCT_DETAIL = /* GraphQL */ `
  query AdminProduct($id: ID!) {
    product(id: $id) {
      id title handle status productType vendor tags description totalInventory tracksInventory createdAt updatedAt onlineStoreUrl
      options { name values }
      media(first: 8) { nodes { ... on MediaImage { image { url altText } } } }
      variants(first: 100) {
        pageInfo { hasNextPage }
        nodes {
          id title sku price inventoryQuantity inventoryPolicy availableForSale
          selectedOptions { name value }
        }
      }
    }
    shop { currencyCode }
  }
`;

export const INVENTORY_LIST = /* GraphQL */ `
  query AdminInventory($first: Int, $last: Int, $after: String, $before: String, $query: String) {
    productVariants(first: $first, last: $last, after: $after, before: $before, query: $query) {
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      nodes {
        id title sku inventoryQuantity inventoryPolicy
        product { id title status tracksInventory }
      }
    }
  }
`;

/** `customer` is only requested when the app has the read_customers permission. */
const orderRow = (withCustomer: boolean) => `
  id name createdAt cancelledAt test displayFinancialStatus displayFulfillmentStatus subtotalLineItemsQuantity
  currentTotalPriceSet { shopMoney { ${MONEY} } }
  ${withCustomer ? "customer { displayName }" : ""}
`;

export const orderList = (withCustomer: boolean) => /* GraphQL */ `
  query AdminOrders($first: Int, $last: Int, $after: String, $before: String, $query: String) {
    orders(first: $first, last: $last, after: $after, before: $before, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      nodes { ${orderRow(withCustomer)} }
    }
  }
`;

export const orderDetail = (withCustomer: boolean) => /* GraphQL */ `
  query AdminOrder($id: ID!) {
    order(id: $id) {
      ${orderRow(withCustomer)}
      email note
      shippingAddress { city provinceCode countryCodeV2 }
      subtotalPriceSet { shopMoney { ${MONEY} } }
      totalShippingPriceSet { shopMoney { ${MONEY} } }
      totalTaxSet { shopMoney { ${MONEY} } }
      lineItems(first: 50) {
        nodes {
          title variantTitle sku quantity
          originalUnitPriceSet { shopMoney { ${MONEY} } }
          discountedTotalSet { shopMoney { ${MONEY} } }
          image { url }
          customAttributes { key value }
        }
      }
    }
  }
`;

export const CUSTOMER_LIST = /* GraphQL */ `
  query AdminCustomers($first: Int, $last: Int, $after: String, $before: String, $query: String) {
    customers(first: $first, last: $last, after: $after, before: $before, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      nodes {
        id displayName createdAt numberOfOrders
        defaultEmailAddress { emailAddress }
        amountSpent { ${MONEY} }
      }
    }
  }
`;

export const CUSTOMER_DETAIL = /* GraphQL */ `
  query AdminCustomer($id: ID!) {
    customer(id: $id) {
      id displayName createdAt numberOfOrders
      defaultEmailAddress { emailAddress }
      amountSpent { ${MONEY} }
      defaultAddress { city provinceCode countryCodeV2 }
      orders(first: 10, sortKey: CREATED_AT, reverse: true) {
        nodes { ${orderRow(false)} }
      }
    }
  }
`;

/** The dashboard is several small queries, so a missing permission only blanks its own panel. */
export const DASHBOARD_CORE = /* GraphQL */ `
  query AdminDashboardCore {
    shop { name currencyCode }
    productsAll: productsCount { count precision }
    productsActive: productsCount(query: "status:active") { count precision }
  }
`;

export const dashboardOrders = (withCustomer: boolean) => /* GraphQL */ `
  query AdminDashboardOrders($since: String!) {
    ordersSince: ordersCount(query: $since) { count precision }
    recentOrders: orders(first: 5, sortKey: CREATED_AT, reverse: true) {
      nodes { ${orderRow(withCustomer)} }
    }
  }
`;

export const REVENUE = /* GraphQL */ `
  query AdminRevenue($query: String!) {
    orders(first: 200, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage }
      nodes { currentTotalPriceSet { shopMoney { ${MONEY} } } }
    }
  }
`;

export const CUSTOMERS_COUNT = /* GraphQL */ `
  query AdminCustomersCount { customersCount { count precision } }
`;
