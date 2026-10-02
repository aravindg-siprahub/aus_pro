# Shopify setup

The storefront reads products from Shopify and sends customers to Shopify's hosted checkout to pay.
Everything that talks to Shopify runs on the server; the browser only calls this app's `/api` routes.

## 1. Environment

Copy `.env.example` to `.env.local` (gitignored) and fill in:

| Variable | Where to find it |
| --- | --- |
| `SHOPIFY_SHOP_DOMAIN` | Your permanent domain, e.g. `my-store.myshopify.com` (Shopify admin → Settings → Domains) |
| `SHOPIFY_CLIENT_ID` | Dev Dashboard → your app → Settings → Credentials |
| `SHOPIFY_CLIENT_SECRET` | Same page. Keep it private; rotate it if it is ever shared |
| `ADMIN_PASSWORD` | You choose it (12+ characters). Protects `/admin`, which shows orders and customers |

`COMMERCE_PROVIDER` is `auto` by default: Shopify when the three variables are set, the built-in mock
catalogue when none are. Set it to `mock` to force the mock flow, or `shopify` to require Shopify.

## 2. App access scopes

Set these in the Dev Dashboard when you create an app version, then release it and install it on the store:

- `read_products` – catalogue
- `read_draft_orders`, `write_draft_orders` – create the checkout and read its status
- `read_orders` – read the order number once a draft order is paid, and the admin Orders area

Optional: `read_customers` enables the admin Customers area and customer names on orders. Leave it off if you
don't need those; everything else keeps working and the admin says which panels need it.
Orders older than 60 days need `read_all_orders`, which this app deliberately does not request.

The app and the store must belong to the same Shopify organization (client credentials grant).

## 3. Product conventions

Products appear in the storefront when they are **Active** and have:

- a **Size** option with values from `XS S M L XL XXL` (`2XL` is accepted for `XXL`);
- a **Color** option (optional). Known colour names get a swatch; unknown names get a neutral one;
- a category, from the product type (contains *polo*, *hood*, *oversized/boxy/drop*, or *round/crew/tee*)
  or an explicit tag such as `category:polo`.

Optional: tag `badge:New` for a label, and product metafields `custom.material` and `custom.fit`
(single-line text) for the product details.

Products that don't match are skipped, with a warning in the server log.

## 4. How checkout works

1. The bag is sent to `POST /api/checkout` as variant ids, quantities and print details only.
2. The server re-reads every variant from Shopify, prices each line itself (variant price plus the
   print surcharge) and creates a **draft order**. The print is stored as line-item properties
   (Custom text, Font, Text colour, Print size, Placement) for production, plus a hidden `_customization` property.
3. The customer pays on Shopify's invoice checkout, where shipping and tax are calculated.
4. `/order/<reference>` checks the draft order every few seconds and shows the confirmation once Shopify
   reports it paid. The reference is signed, so order ids can't be guessed.

Print surcharges default to 6 / 9 / 12 in the store's currency; override with `PRINT_SURCHARGE_*`.

## 5. The admin area

`/admin` is a read-only dashboard over live Shopify data: Dashboard, Products, Inventory, Orders, Customers,
Settings and Shopify connection. Sign in with `ADMIN_PASSWORD`. Sessions last 8 hours, failed logins are
rate-limited, and every admin page and `/api/admin/*` route is checked on the server. Products, stock and
orders are changed in the Shopify admin, not here.

The dashboard shows only what Shopify reports: totals from `productsCount` / `ordersCount` / `customersCount`,
revenue as the sum of paid, non-test orders from the last 30 days (marked "partial" past 200 orders), and low
stock as active variants with 5 or fewer left. If a panel's data can't be read it says why instead of showing a number.

## 6. Verifying the connection

- Signed in: open **Shopify connection** in the admin for the shop, permissions, token renewal time and catalogue readiness.
- Public liveness check for monitoring: `curl http://localhost:3000/api/health/shopify` answers only `{"ok": true}` or an error code.

If the connection page says **"The app isn't installed on this store"**, open the app in the Dev Dashboard and
choose *Install app* for your store. A released version alone does not install it.

## 7. Checks

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run check:bundle
```

`check:bundle` fails if anything that handles credentials ends up in the browser JavaScript.
