import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getPublicShopConfig } from "@/lib/commerce/server";
import { ShopifyCommerceProvider } from "@/lib/commerce/shopify-provider";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const config = await getPublicShopConfig();
  let storeName = "Sample catalogue (not connected)";
  if (config.provider === "shopify") {
    // The shop name is cached for ten minutes; if Shopify is unreachable the pages explain why.
    storeName = await new ShopifyCommerceProvider().getShopInfo().then((s) => s.name, () => "Shopify store");
  }
  return <AdminShell storeName={storeName}>{children}</AdminShell>;
}
