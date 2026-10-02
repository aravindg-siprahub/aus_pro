import type { Metadata } from "next";
import { SESSION_SECONDS } from "@/lib/admin/session";
import { getProviderMode, getPublicShopConfig } from "@/lib/commerce/server";
import { ConfigError, getShopifyConfig, type ShopifyConfig } from "@/lib/shopify/config";
import { LOW_STOCK_THRESHOLD } from "@/lib/shopify/admin/input";
import { Badge, PageTitle, Panel } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const ENV_VARS = [
  { name: "SHOPIFY_SHOP_DOMAIN", purpose: "Your store’s .myshopify.com domain", required: true },
  { name: "SHOPIFY_CLIENT_ID", purpose: "Dev Dashboard app client ID", required: true },
  { name: "SHOPIFY_CLIENT_SECRET", purpose: "Dev Dashboard app client secret", required: true },
  { name: "ADMIN_PASSWORD", purpose: "Password for this admin area (12+ characters)", required: true },
  { name: "COMMERCE_PROVIDER", purpose: "auto, shopify or mock", required: false },
  { name: "SHOPIFY_API_VERSION", purpose: "Admin API version", required: false },
  { name: "SHOPIFY_TIMEOUT_MS", purpose: "Per-request timeout", required: false },
  { name: "PRINT_SURCHARGE_SMALL / MEDIUM / LARGE", purpose: "Extra charge for a custom print", required: false },
];

/** Whether each variable is set, never its value. */
function isSet(name: string) {
  return name.includes("/") ? ["PRINT_SURCHARGE_SMALL", "PRINT_SURCHARGE_MEDIUM", "PRINT_SURCHARGE_LARGE"].some((n) => !!process.env[n]) : !!process.env[name]?.trim();
}

export default async function SettingsPage() {
  const mode = getProviderMode();
  const shop = await getPublicShopConfig();
  let cfg: ShopifyConfig | null = null;
  let configError: string | null = null;
  if (mode === "shopify") {
    try {
      cfg = getShopifyConfig();
    } catch (e) {
      configError = e instanceof ConfigError ? e.message : "Configuration couldn’t be read.";
    }
  }

  return (
    <>
      <PageTitle title="Settings" description="How this app is configured. Values come from environment variables, so changes are made in .env.local and need a restart." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Store">
          <dl className="divide-y divide-line-soft text-[14px]">
            <Row k="Data source" v={<Badge tone={mode === "shopify" ? "green" : "amber"}>{mode === "shopify" ? "Shopify" : "Sample catalogue"}</Badge>} />
            {cfg && <Row k="Store domain" v={cfg.shopDomain} />}
            {cfg && <Row k="Admin API version" v={cfg.apiVersion} />}
            {cfg && <Row k="Request timeout" v={`${cfg.timeoutMs / 1000}s`} />}
            <Row k="Currency" v={shop.currency} />
          </dl>
          {configError && <p role="alert" className="border-t border-line-soft px-5 py-3 text-[13px] text-danger">{configError}</p>}
        </Panel>

        <Panel title="Custom print pricing">
          <dl className="divide-y divide-line-soft text-[14px]">
            {(["small", "medium", "large"] as const).map((size) => (
              <Row key={size} k={`${size[0].toUpperCase()}${size.slice(1)} print`} v={`+${new Intl.NumberFormat("en-US", { style: "currency", currency: shop.currency }).format(shop.printSurcharge[size])}`} />
            ))}
          </dl>
          <p className="border-t border-line-soft px-5 py-3 text-[12px] text-mute">Added to the variant price on the server when checkout is created. Browser-sent prices are ignored.</p>
        </Panel>

        <Panel title="Behaviour">
          <dl className="divide-y divide-line-soft text-[14px]">
            <Row k="Low-stock threshold" v={`${LOW_STOCK_THRESHOLD} or fewer`} />
            <Row k="Admin session" v={`${SESSION_SECONDS / 3600} hours`} />
            <Row k="Catalogue cache" v="60 seconds" />
            <Row k="Dashboard cache" v="30 seconds" />
            <Row k="Order history window" v="Last 60 days" />
          </dl>
        </Panel>

        <Panel title="Environment variables">
          <ul className="divide-y divide-line-soft text-[14px]">
            {ENV_VARS.map((v) => (
              <li key={v.name} className="flex items-start justify-between gap-3 px-5 py-2.5">
                <div className="min-w-0">
                  <code className="break-all text-[13px]">{v.name}</code>
                  <p className="text-[12px] text-mute">{v.purpose}</p>
                </div>
                {isSet(v.name) ? <Badge tone="green">Set</Badge> : <Badge tone={v.required ? "red" : "grey"}>{v.required ? "Missing" : "Default"}</Badge>}
              </li>
            ))}
          </ul>
          <p className="border-t border-line-soft px-5 py-3 text-[12px] text-mute">Only whether a variable is set is shown, never its value.</p>
        </Panel>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5">
      <dt className="text-mute">{k}</dt>
      <dd className="break-words text-right">{v}</dd>
    </div>
  );
}
