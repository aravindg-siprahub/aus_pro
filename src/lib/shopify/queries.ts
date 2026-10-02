/**
 * GraphQL documents for the Admin API. Fields were checked against the Admin GraphQL reference.
 * Query shapes keep the requested cost well under the 1,000-point single-query limit
 * (small product pages, bounded variant lists).
 */

export const PRODUCT_FIELDS = /* GraphQL */ `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    productType
    tags
    status
    options { name values }
    material: metafield(namespace: "custom", key: "material") { value }
    fit: metafield(namespace: "custom", key: "fit") { value }
    # Videos and 3D models come back as empty objects (no MediaImage match) and are skipped by the mapper.
    media(first: 10) {
      nodes { ... on MediaImage { id image { url altText width height } } }
    }
    variants(first: 100) {
      nodes {
        id
        price
        availableForSale
        selectedOptions { name value }
        media(first: 1) { nodes { ... on MediaImage { image { url } } } }
      }
    }
  }
`;

export const PRODUCTS_PAGE_SIZE = 4;

export const PRODUCTS_QUERY = /* GraphQL */ `
  ${PRODUCT_FIELDS}
  query Products($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      pageInfo { hasNextPage endCursor }
      nodes { ...ProductFields }
    }
  }
`;

export const PRODUCT_BY_ID_QUERY = /* GraphQL */ `
  ${PRODUCT_FIELDS}
  query ProductById($id: ID!) {
    product(id: $id) { ...ProductFields }
  }
`;

export const SHOP_QUERY = /* GraphQL */ `
  query Shop {
    shop { name currencyCode }
  }
`;

const VARIANT_FIELDS = /* GraphQL */ `
  id
  price
  availableForSale
  inventoryQuantity
  inventoryPolicy
  selectedOptions { name value }
  product { id handle title productType tags status options { name values } }
`;

export const VARIANTS_QUERY = /* GraphQL */ `
  query Variants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant { ${VARIANT_FIELDS} }
    }
  }
`;

export const DRAFT_ORDER_CREATE = /* GraphQL */ `
  mutation DraftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id name invoiceUrl status }
      userErrors { field message }
    }
  }
`;

export const DRAFT_ORDER_QUERY = /* GraphQL */ `
  query DraftOrder($id: ID!) {
    draftOrder(id: $id) {
      id
      name
      status
      invoiceUrl
      email
      createdAt
      completedAt
      subtotalPriceSet { shopMoney { amount currencyCode } }
      totalShippingPriceSet { shopMoney { amount } }
      totalPriceSet { shopMoney { amount } }
      shippingAddress { firstName lastName address1 address2 city provinceCode zip countryCodeV2 phone }
      order { id name createdAt }
      lineItems(first: 50) {
        nodes {
          quantity
          customAttributes { key value }
          variant { ${VARIANT_FIELDS} }
        }
      }
    }
  }
`;
